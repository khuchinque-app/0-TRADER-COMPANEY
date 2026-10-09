#!/bin/bash
exec sshpass -p 'admin1' scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -P 22221 "$@"
