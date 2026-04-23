#!/bin/bash
ssh -i ../openclaw-hardened-ansible/nativobot.pem -p 2222 openclaw@54.147.195.15 "podman ps && free -h"
