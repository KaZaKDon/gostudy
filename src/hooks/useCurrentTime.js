import { useEffect, useState } from 'react';

export function useCurrentTime(intervalMilliseconds = 30000) {
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setCurrentTime(new Date());
        }, intervalMilliseconds);

        return () => window.clearInterval(intervalId);
    }, [intervalMilliseconds]);

    return currentTime;
}
