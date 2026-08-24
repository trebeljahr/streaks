#!/usr/bin/env bash
#
# Source-this helper that sets the env vars Gradle + Capacitor need
# to build Android without Android Studio being open.
#
#   - JAVA_HOME: points at Android Studio's bundled JetBrains Runtime.
#   - ANDROID_HOME: the SDK root. Android Studio installs here on Mac
#     by default.
#
# Usage:
#     source scripts/android-env.sh && <command>
#
# Paths are Mac-specific (Intel and Apple Silicon share them). Override
# via your shell profile before running pnpm if your install is non-
# standard.

if [ -z "$JAVA_HOME" ]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi
if [ -z "$ANDROID_HOME" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
if [ -z "$ANDROID_SDK_ROOT" ]; then
  export ANDROID_SDK_ROOT="$ANDROID_HOME"
fi

export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
