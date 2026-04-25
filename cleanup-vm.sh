#!/bin/bash
# Standalone cleanup script for GCP VM

echo "Starting cleanup on GCP VM..."

# Remove all dangling images
echo "Pruning unused Docker objects..."
docker system prune -af

# Specifically clear registry storage if any
# Note: This doesn't delete the registry container, just orphans.

# Check disk space after cleanup
echo "Disk space status:"
df -h | grep '^/dev/'

echo "Cleanup complete."
