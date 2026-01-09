#!/bin/bash

# macOS BlackHole Installation Script
# This script checks if BlackHole is installed and installs it using Homebrew
# Designed to work with Electron app execution context (via child_process)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to find Homebrew installation
find_homebrew() {
    # Common Homebrew installation paths
    local brew_paths=(
        "/opt/homebrew/bin/brew"      # Apple Silicon (M1/M2+)
        "/usr/local/bin/brew"         # Intel Macs
        "$HOME/.homebrew/bin/brew"    # Custom user install
    )
    
    # Check common paths first
    for path in "${brew_paths[@]}"; do
        if [ -f "$path" ] && [ -x "$path" ]; then
            echo "$path"
            return 0
        fi
    done
    
    # Fallback: check if brew is in PATH
    if command -v brew &> /dev/null; then
        command -v brew
        return 0
    fi
    
    return 1
}

# Function to check if Homebrew is installed
check_homebrew_installed() {
    local brew_path=$(find_homebrew)
    if [ -n "$brew_path" ]; then
        return 0  # Installed
    else
        return 1  # Not installed
    fi
}

# Function to check if BlackHole is installed
check_blackhole_installed() {
    # Check if BlackHole appears in system_profiler output
    if system_profiler SPAudioDataType 2>/dev/null | grep -q "BlackHole"; then
        return 0  # Installed
    else
        return 1  # Not installed
    fi
}

# Function to check and warn about Homebrew
check_homebrew_required() {
    echo -e "${RED}Warning: Homebrew is not installed.${NC}" >&2
    echo -e "${RED}This application requires Homebrew to install BlackHole.${NC}" >&2
    echo -e "${YELLOW}Please install Homebrew from https://brew.sh and try again.${NC}" >&2
    return 1
}

# Main installation function
install_blackhole() {
    local brew_path=$(find_homebrew)
    
    if [ -z "$brew_path" ]; then
        echo -e "${RED}Could not find Homebrew installation.${NC}" >&2
        return 1
    fi
    
    echo -e "${YELLOW}Installing BlackHole 2ch via Homebrew...${NC}"
    
    # Execute brew install with the found path
    # Source common shell profiles to ensure environment is set up
    if [ -f "$HOME/.zprofile" ]; then
        source "$HOME/.zprofile" 2>/dev/null || true
    elif [ -f "$HOME/.bash_profile" ]; then
        source "$HOME/.bash_profile" 2>/dev/null || true
    elif [ -f "$HOME/.profile" ]; then
        source "$HOME/.profile" 2>/dev/null || true
    fi
    
    # Run brew install
    if "$brew_path" install --cask blackhole-2ch 2>&1; then
        echo -e "${GREEN}BlackHole 2ch installed successfully!${NC}"
        echo -e "${YELLOW}Note: You may need to restart your Mac for the audio device to appear.${NC}"
        return 0
    else
        echo -e "${RED}Failed to install BlackHole 2ch.${NC}" >&2
        return 1
    fi
}

# Main execution
main() {
    echo "Checking for BlackHole installation..."
    
    # Check if already installed
    if check_blackhole_installed; then
        echo -e "${GREEN}BlackHole is already installed.${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}BlackHole not found. Attempting to install...${NC}"
    
    # Check if Homebrew is installed
    if ! check_homebrew_installed; then
        check_homebrew_required
        return 1
    fi
    
    # Install BlackHole
    if install_blackhole; then
        return 0
    else
        return 1
    fi
}

# Run main function
main "$@"

