#!/usr/bin/env python3
"""
lightweight-ssh-server.py — Non-root SSH server with dual auth
Accepts password (chinque / admin1) AND public key auth on port 2222.
"""

import socket
import threading
import os
import sys
import paramiko
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [SSH-SERVER] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('/tmp/ssh-server.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# SSH Configuration
SSH_HOST = '0.0.0.0'
SSH_PORT = 2222
SSH_USER = 'chinque'
SSH_PASS = 'admin1'
HOST_KEY_PATH = '/home/chinque/.ssh/ssh_host_ed25519_key'
AUTHORIZED_KEYS_PATH = '/home/chinque/.ssh/authorized_keys'


class SSHServerHandler(paramiko.ServerInterface):
    def __init__(self):
        self.event = threading.Event()

    def check_channel_request(self, kind, chanid):
        if kind == 'session':
            return paramiko.OPEN_SUCCEEDED
        return paramiko.OPEN_FAILED_ADMINISTRATIVELY_PROHIBITED

    def check_auth_password(self, username, password):
        if username == SSH_USER and password == SSH_PASS:
            logger.info(f"Password auth successful for user '{username}'")
            return paramiko.AUTH_SUCCESSFUL
        logger.warning(f"Password auth failed for user '{username}'")
        return paramiko.AUTH_FAILED

    def check_auth_publickey(self, username, key):
        if username != SSH_USER:
            return paramiko.AUTH_FAILED
        
        # Check if key is in authorized_keys
        try:
            with open(AUTHORIZED_KEYS_PATH, 'r') as f:
                authorized_keys = f.read()
            
            # Convert key to OpenSSH format for comparison
            pub_key = f"{key.get_name()} {key.get_base64()}"
            
            if pub_key in authorized_keys or key.get_base64() in authorized_keys:
                logger.info(f"Public key auth successful for user '{username}'")
                return paramiko.AUTH_SUCCESSFUL
        except Exception as e:
            logger.error(f"Error reading authorized_keys: {e}")
        
        logger.warning(f"Public key auth failed for user '{username}'")
        return paramiko.AUTH_FAILED

    def check_channel_shell_request(self, channel):
        self.event.set()
        return True

    def check_channel_exec_request(self, channel, command):
        self.event.set()
        return True

    def check_channel_pty_request(self, channel, term, width, height, pixelwidth, pixelheight, modes):
        return True


def generate_host_key():
    """Generate RSA host key if it doesn't exist"""
    if not os.path.exists(HOST_KEY_PATH):
        logger.info(f"Generating host key at {HOST_KEY_PATH}")
        key = paramiko.RSAKey.generate(2048)
        with open(HOST_KEY_PATH, 'w') as f:
            os.chmod(HOST_KEY_PATH, 0o600)
            key.write_private_key(f)
    return paramiko.RSAKey(filename=HOST_KEY_PATH)


def handle_client(client_socket, addr):
    """Handle a single SSH client connection"""
    logger.info(f"Connection from {addr}")
    
    try:
        # Create transport
        transport = paramiko.Transport(client_socket)
        transport.add_server_key(host_key)
        
        # Start server
        server = SSHServerHandler()
        try:
            transport.start_server(server=server)
        except paramiko.SSHException as e:
            logger.error(f"SSH negotiation failed from {addr}: {e}")
            return
        
        # Wait for auth
        channel = transport.accept()
        if channel is None:
            logger.warning(f"No channel from {addr}")
            return
        
        logger.info(f"Authenticated session from {addr}")
        
        # Handle shell/exec requests
        while True:
            if transport.is_active():
                channel = transport.accept(1.0)
                if channel is None:
                    continue
                
                # Handle exec requests
                if channel.get_name() == 'session':
                    while True:
                        if channel.exit_status_ready():
                            break
                        
                        # Read command
                        if channel.recv_ready():
                            cmd = channel.recv(1024).decode('utf-8').strip()
                            if cmd:
                                logger.info(f"Executing command: {cmd}")
                                
                                # Execute command
                                try:
                                    import subprocess
                                    result = subprocess.run(
                                        cmd, shell=True,
                                        capture_output=True, text=True,
                                        timeout=30
                                    )
                                    output = result.stdout + result.stderr
                                    channel.send(output.encode('utf-8'))
                                except Exception as e:
                                    channel.send(f"Error: {str(e)}\n".encode('utf-8'))
                        
                        if not transport.is_active():
                            break
            else:
                break
                
    except Exception as e:
        logger.error(f"Error handling client {addr}: {e}")
    finally:
        try:
            transport.close()
        except:
            pass
        client_socket.close()
        logger.info(f"Connection closed from {addr}")


def main():
    global host_key
    
    # Ensure SSH directory exists with correct permissions
    ssh_dir = os.path.dirname(AUTHORIZED_KEYS_PATH)
    os.makedirs(ssh_dir, exist_ok=True)
    os.makedirs(os.path.dirname(HOST_KEY_PATH), exist_ok=True)
    
    # Ensure authorized_keys exists
    if not os.path.exists(AUTHORIZED_KEYS_PATH):
        open(AUTHORIZED_KEYS_PATH, 'a').close()
        os.chmod(AUTHORIZED_KEYS_PATH, 0o600)
    
    # Generate host key
    host_key = generate_host_key()
    logger.info(f"Host key loaded from {HOST_KEY_PATH}")
    
    # Create socket
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((SSH_HOST, SSH_PORT))
    server_socket.listen(5)
    
    logger.info(f"SSH server listening on {SSH_HOST}:{SSH_PORT}")
    logger.info(f"User: {SSH_USER}")
    logger.info(f"Password auth: ENABLED (admin1)")
    logger.info(f"Public key auth: ENABLED (~/.ssh/authorized_keys)")
    
    try:
        while True:
            client_socket, addr = server_socket.accept()
            client_thread = threading.Thread(
                target=handle_client,
                args=(client_socket, addr),
                daemon=True
            )
            client_thread.start()
    except KeyboardInterrupt:
        logger.info("Shutting down SSH server")
    finally:
        server_socket.close()


if __name__ == '__main__':
    main()