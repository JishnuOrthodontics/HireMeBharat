cat << 'EOF' > /tmp/daemon.json
{
  "insecure-registries": ["0.0.0.0/0", "localhost:5000", "34.180.13.219:5000", "10.160.0.2:5000"]
}
EOF
sudo mv /tmp/daemon.json /etc/docker/daemon.json
sudo systemctl restart docker
sleep 2
docker ps

