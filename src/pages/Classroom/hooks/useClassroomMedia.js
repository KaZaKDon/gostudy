import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { API } from '../../../api/api.js';
import { apiRequest } from '../../../api/apiRequest.js';

function getIceServers() {
    const servers = [{ urls: 'stun:stun.l.google.com:19302' }];
    const turnUrl = String(import.meta.env.VITE_WEBRTC_TURN_URL || '').trim();

    if (turnUrl) {
        servers.push({
            urls: turnUrl,
            username: String(import.meta.env.VITE_WEBRTC_TURN_USERNAME || ''),
            credential: String(import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL || ''),
        });
    }

    return servers;
}

function stopStream(stream) {
    for (const track of stream?.getTracks() || []) {
        track.stop();
    }
}

export function useClassroomMedia({
    lessonId,
    role,
    subscribeSignals,
}) {
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
    const [isCameraEnabled, setIsCameraEnabled] = useState(true);
    const [joinMode, setJoinMode] = useState(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
    const [screenErrorMessage, setScreenErrorMessage] = useState('');
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const localPreviewStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const peerRef = useRef(null);
    const pendingCandidatesRef = useRef([]);

    const attachLocalVideo = useCallback((element) => {
        localVideoRef.current = element;

        if (element) {
            element.srcObject = localPreviewStreamRef.current
                || localStreamRef.current;
        }
    }, []);

    const attachRemoteVideo = useCallback((element) => {
        remoteVideoRef.current = element;

        if (element) {
            element.srcObject = remoteStreamRef.current;
        }
    }, []);
    const offerInFlightRef = useRef(false);

    const sendSignal = useCallback((signalType, payload = {}) => apiRequest(
        API.classroomMediaSignal,
        {
            method: 'POST',
            body: {
                lesson_id: Number(lessonId),
                signal_type: signalType,
                payload,
            },
        },
    ), [lessonId]);

    const closePeer = useCallback(() => {
        peerRef.current?.close();
        peerRef.current = null;
        pendingCandidatesRef.current = [];

        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
        remoteStreamRef.current = null;
    }, []);

    const createPeer = useCallback(() => {
        if (peerRef.current) {
            return peerRef.current;
        }

        const peer = new RTCPeerConnection({ iceServers: getIceServers() });

        for (const track of localStreamRef.current?.getTracks() || []) {
            peer.addTrack(track, localStreamRef.current);
        }

        if (!localStreamRef.current?.getAudioTracks().length) {
            peer.addTransceiver('audio', { direction: 'recvonly' });
        }
        if (!localStreamRef.current?.getVideoTracks().length) {
            peer.addTransceiver('video', {
                direction: role === 'teacher' ? 'sendrecv' : 'recvonly',
            });
        }

        peer.onicecandidate = ({ candidate }) => {
            if (candidate) {
                sendSignal('ice', candidate.toJSON()).catch(() => {});
            }
        };
        peer.ontrack = ({ streams }) => {
            remoteStreamRef.current = streams[0] || null;
            if (remoteVideoRef.current && streams[0]) {
                remoteVideoRef.current.srcObject = streams[0];
            }
        };
        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'connected') {
                setStatus('connected');
            } else if (['failed', 'disconnected'].includes(peer.connectionState)) {
                setStatus('waiting');
            }
        };
        peerRef.current = peer;
        return peer;
    }, [role, sendSignal]);

    const createOffer = useCallback(async () => {
        if (!localStreamRef.current || offerInFlightRef.current) {
            return;
        }

        const peer = createPeer();

        if (peer.signalingState !== 'stable') {
            return;
        }

        offerInFlightRef.current = true;

        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            await sendSignal('offer', offer);
        } finally {
            offerInFlightRef.current = false;
        }
    }, [createPeer, sendSignal]);

    const applyPendingCandidates = useCallback(async (peer) => {
        const candidates = pendingCandidatesRef.current.splice(0);

        for (const candidate of candidates) {
            await peer.addIceCandidate(candidate);
        }
    }, []);

    const handleSignal = useCallback(async (signal) => {
        if (!signal || !localStreamRef.current) {
            return;
        }

        try {
            if (signal.signal_type === 'ready') {
                if (role === 'teacher') {
                    await createOffer();
                    if (screenStreamRef.current) {
                        await sendSignal('screen_state', { is_sharing: true });
                    }
                } else {
                    await sendSignal('ready');
                }
                return;
            }

            if (signal.signal_type === 'leave') {
                closePeer();
                setIsRemoteScreenSharing(false);
                setStatus('waiting');
                return;
            }

            if (signal.signal_type === 'screen_state') {
                setIsRemoteScreenSharing(Boolean(signal.data?.is_sharing));
                return;
            }

            const peer = createPeer();

            if (signal.signal_type === 'offer') {
                await peer.setRemoteDescription(signal.data);
                await applyPendingCandidates(peer);
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                await sendSignal('answer', answer);
            } else if (signal.signal_type === 'answer') {
                await peer.setRemoteDescription(signal.data);
                await applyPendingCandidates(peer);
            } else if (signal.signal_type === 'ice') {
                if (peer.remoteDescription) {
                    await peer.addIceCandidate(signal.data);
                } else {
                    pendingCandidatesRef.current.push(signal.data);
                }
            }
        } catch {
            setErrorMessage('Не удалось установить видеосвязь');
            setStatus('error');
        }
    }, [
        applyPendingCandidates,
        closePeer,
        createOffer,
        createPeer,
        role,
        sendSignal,
    ]);

    useEffect(() => subscribeSignals(handleSignal), [handleSignal, subscribeSignals]);

    const join = useCallback(async (mode = 'camera') => {
        setStatus('requesting');
        setErrorMessage('');
        closePeer();
        stopStream(localStreamRef.current);
        localStreamRef.current = null;

        let stream;

        try {
            stream = mode === 'observer'
                ? new MediaStream()
                : await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: mode === 'camera',
                });
            localStreamRef.current = stream;
            localPreviewStreamRef.current = stream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            setJoinMode(mode);
            setIsMicrophoneEnabled(stream.getAudioTracks().length > 0);
            setIsCameraEnabled(stream.getVideoTracks().length > 0);
            setStatus('waiting');
        } catch {
            stopStream(stream);
            setJoinMode(null);
            setErrorMessage(mode === 'camera'
                ? 'Не удалось получить доступ к камере и микрофону. Выберите другой режим или проверьте разрешения браузера.'
                : 'Не удалось получить доступ к микрофону. Выберите режим просмотра или проверьте разрешение браузера.');
            setStatus('error');
            return;
        }

        try {
            await sendSignal('ready');
        } catch (error) {
            stopStream(localStreamRef.current);
            localStreamRef.current = null;
            localPreviewStreamRef.current = null;
            setJoinMode(null);
            setErrorMessage(error instanceof Error
                ? error.message
                : 'Не удалось подключиться к видеосвязи урока');
            setStatus('error');
        }
    }, [closePeer, sendSignal]);

    const leave = useCallback(() => {
        sendSignal('leave').catch(() => {});
        closePeer();
        stopStream(localStreamRef.current);
        localStreamRef.current = null;
        localPreviewStreamRef.current = null;
        stopStream(screenStreamRef.current);
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        setIsRemoteScreenSharing(false);
        setJoinMode(null);

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        setStatus('idle');
    }, [closePeer, sendSignal]);

    useEffect(() => () => {
        closePeer();
        stopStream(localStreamRef.current);
        stopStream(screenStreamRef.current);
    }, [closePeer]);

    const toggleMicrophone = useCallback(() => {
        const track = localStreamRef.current?.getAudioTracks()[0];

        if (track) {
            track.enabled = !track.enabled;
            setIsMicrophoneEnabled(track.enabled);
        }
    }, []);

    const toggleCamera = useCallback(() => {
        const track = localStreamRef.current?.getVideoTracks()[0];

        if (track) {
            track.enabled = !track.enabled;
            setIsCameraEnabled(track.enabled);
        }
    }, []);

    const stopScreenShare = useCallback(() => {
        const screenStream = screenStreamRef.current;

        if (!screenStream) {
            return;
        }

        const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
        const videoSender = peerRef.current?.getTransceivers().find(
            (transceiver) => transceiver.receiver.track.kind === 'video',
        )?.sender;

        if (videoSender) {
            videoSender.replaceTrack(cameraTrack || null).catch(() => {});
        }

        stopStream(screenStream);
        screenStreamRef.current = null;
        localPreviewStreamRef.current = localStreamRef.current;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }

        setIsScreenSharing(false);
        setScreenErrorMessage('');
        sendSignal('screen_state', { is_sharing: false }).catch(() => {});
    }, [sendSignal]);

    const startScreenShare = useCallback(async () => {
        if (role !== 'teacher' || !localStreamRef.current) {
            return;
        }

        setScreenErrorMessage('');

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                audio: false,
                video: true,
            });
            const screenTrack = screenStream.getVideoTracks()[0];
            const peer = createPeer();
            const videoSender = peer.getTransceivers().find(
                (transceiver) => transceiver.receiver.track.kind === 'video',
            )?.sender;

            if (!screenTrack || !videoSender) {
                stopStream(screenStream);
                throw new Error('Screen track is unavailable');
            }

            await videoSender.replaceTrack(screenTrack);
            screenStreamRef.current = screenStream;
            localPreviewStreamRef.current = screenStream;

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = screenStream;
            }

            screenTrack.addEventListener('ended', stopScreenShare, { once: true });
            setIsScreenSharing(true);
            await sendSignal('screen_state', { is_sharing: true });
        } catch {
            setScreenErrorMessage(
                'Не удалось начать показ экрана. Проверьте разрешение браузера.',
            );
        }
    }, [createPeer, role, sendSignal, stopScreenShare]);

    return {
        status,
        errorMessage,
        isMicrophoneEnabled,
        isCameraEnabled,
        joinMode,
        hasMicrophone: joinMode === 'camera' || joinMode === 'audio',
        hasCamera: joinMode === 'camera',
        isScreenSharing,
        isRemoteScreenSharing,
        screenErrorMessage,
        localVideoRef: attachLocalVideo,
        remoteVideoRef: attachRemoteVideo,
        join,
        leave,
        toggleMicrophone,
        toggleCamera,
        startScreenShare,
        stopScreenShare,
    };
}
