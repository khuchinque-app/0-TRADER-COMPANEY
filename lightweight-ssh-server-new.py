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
import subprocess

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
HOST_KEY_PATH = '/home/chinque/.ssh/ssh_host_rsa_key'
AUTHORIZED_KEYS_PATH = '/home/chinque/.ssh/authorized_keys'


def load_authorized_keys():
    """Load authorized public keys from file"""
    keys = set()
    try:
        with open(AUTHORIZED_KEYS_PATH, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    parts = line.split()
                    if len(parts) >= 2:
                        keys.add(parts[1])  # Store just the base64 part for comparison
                        keys.add(line)  # Store full line for exact match
    except Exception as e:
        logger.error(f"Error reading authorized_keys: {e}")
    return keys


class SSHServerHandler(paramiko.ServerInterface):
    def __init__(self):
        self.event = threading.Event()
        self.authorized_keys = load_authorized_keys()

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
        
        key_base64 = key.get_base64()
        
        # Check if key is in authorized_keys (compare base64 or full line)
        if key_base64 in self.authorized_keys:
            logger.info(f"Public key auth successful for user '{username}'")
            return paramiko.AUTH_SUCCESSFUL
        
        # Also check full key string
        pub_key_str = f"{key.get_name()} {key.get_base64()}"
        if pub_key_str in self.authorized_keys:
            logger.info(f"Public key auth successful for user '{username}'")
            return paramiko.AUTH_SUCCESSFUL
        
        logger.warning(f"Public key auth failed for user '{username}'")
        return paramiko.AUTH_FAILED

    def get_allowed_auths(self, username):
        return 'publickey,password'

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


def execute_command(command):
    """Execute a shell command and return output"""
    try:
        result = subprocess.run(
            command, shell=True,
            capture_output=True, text=True,
            timeout=10
        )
        output = result.stdout + result.stderr
        if not output:
            output = f"Command executed: {command}\n"
        return output
    except subprocess.TimeoutExpired:
        return f"Command timed out: {command}\n"
    except Exception as e:
        return f"Error: {str(e)}\n"


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
        
        # Wait for channel
        channel = transport.accept()
        if channel is None:
            logger.warning(f"No channel from {addr}")
            return
        
        logger.info(f"Authenticated session from {addr}")
        
        # Handle session
        while transport.is_active():
            if channel.recv_ready():
                data = channel.recv(1024).decode('utf-8', errors='ignore')
                if not data:
                    break
                
                # Execute any commands received
                for cmd in data.strip().split('\n'):
                    if cmd:
                        output = execute_command(cmd)
                        channel.send(output.encode('utf-8'))
            
            if not transport.is_active():
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