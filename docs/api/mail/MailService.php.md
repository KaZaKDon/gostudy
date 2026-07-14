<?php

declare(strict_types=1);

namespace GoStudy\Mail;

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';

final class MailService
{
    private array $config;

    public function __construct()
    {
        $this->config = require __DIR__ . '/../config/mail.php';
    }

    public function send(string $to, string $subject, string $html, string $text = ''): bool
    {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();

            $mail->Host = $this->config['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $this->config['username'];
            $mail->Password = $this->config['password'];
            $mail->SMTPSecure = $this->config['encryption'];
            $mail->Port = $this->config['port'];

            $mail->CharSet = 'UTF-8';

            $mail->setFrom(
                $this->config['from_email'],
                $this->config['from_name']
            );

            $mail->addAddress($to);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body = $html;
            $mail->AltBody = $text !== '' ? $text : strip_tags($html);

            return $mail->send();
        } catch (Exception $e) {
            error_log('GoStudy mail error: ' . $mail->ErrorInfo);
            return false;
        }
    }
    public function sendVerificationEmail(
        string $to,
        string $fullName,
        string $verificationUrl
    ): bool {
        require_once __DIR__ . '/templates/verification.php';
    
        $html = gostudyVerificationTemplate($fullName, $verificationUrl);
    
        return $this->send(
            $to,
            'Подтверждение электронной почты — GoStudy',
            $html,
            'Здравствуйте! Для завершения регистрации подтвердите электронную почту: ' . $verificationUrl
        );
    }
}