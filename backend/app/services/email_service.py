import mailtrap as mt
import os
from dotenv import load_dotenv

load_dotenv()

def send_reset_password_email(user_email, reset_token):
    mail_client = mt.MailtrapClient(token=os.getenv("MAILTRAP_API_KEY"), sandbox = True, inbox_id = 4314902)
    
    reset_link = f"{os.getenv('FRONTEND_URL')}/reset-password?token={reset_token}"

    mail = mt.Mail(
        sender=mt.Address(email="hello@veritus.com", name="Veritus System"),
        to=[mt.Address(email=user_email)],
        subject="Redefinição de Senha - Veritus",
        html=f"""
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Olá,</h2>
            <p>Você solicitou a redefinição de sua senha no sistema Veritus.</p>
            <p>Clique no botão abaixo para escolher uma nova senha:</p>
            <a href="{reset_link}" 
               style="background-color: #1E4497; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               Redefinir Senha
            </a>
            <p>Se você não fez esta solicitação, ignore este e-mail.</p>
            <p>O link expira em 15 minutos.</p>
        </div>
        """,
    )

    mail_client.send(mail)