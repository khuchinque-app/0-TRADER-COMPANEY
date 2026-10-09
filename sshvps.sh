#!/bin/bash
exec sshpass -p 'admin1' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -p 22221 khuchinque@187.127.178.20 "$@"
