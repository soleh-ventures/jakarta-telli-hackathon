#!/usr/bin/env bash
#
# One-time setup: create a LiveKit stored outbound SIP trunk for your Twilio number.
# After this succeeds, copy the printed SIPTrunkID into .env.local as LIVEKIT_SIP_TRUNK_ID.
#
# Prerequisites (done in the Twilio console first):
#   1. Create a Twilio Elastic SIP Trunk (Twilio Console -> Elastic SIP Trunking -> Trunks).
#   2. Add a Termination SIP URI -> this becomes <your-trunk>.pstn.twilio.com.
#   3. Under Termination, create Credential List auth (username + password).
#   4. Assign your purchased US number to the trunk.
#
# Docs: https://docs.livekit.io/telephony/making-calls/outbound-trunk/
#       https://docs.livekit.io/telephony/start/sip-trunk-setup/
#
# Usage:
#   export SIP_AUTH_USERNAME=...   # Twilio termination credential username
#   export SIP_AUTH_PASSWORD=...   # Twilio termination credential password
#   # edit scripts/outbound-trunk.json: set "address" and "numbers"
#   ./scripts/setup_twilio_trunk.sh

set -euo pipefail

cd "$(dirname "$0")/.."

: "${SIP_AUTH_USERNAME:?Set SIP_AUTH_USERNAME (Twilio termination credential username)}"
: "${SIP_AUTH_PASSWORD:?Set SIP_AUTH_PASSWORD (Twilio termination credential password)}"

if grep -q "REPLACE_WITH_YOUR_TRUNK" scripts/outbound-trunk.json; then
  echo "ERROR: edit scripts/outbound-trunk.json first (set 'address' and 'numbers')." >&2
  exit 1
fi

echo "Creating LiveKit outbound SIP trunk from scripts/outbound-trunk.json ..."
lk sip outbound create scripts/outbound-trunk.json \
  --auth-user "$SIP_AUTH_USERNAME" \
  --auth-pass "$SIP_AUTH_PASSWORD"

echo
echo "Done. Copy the SIPTrunkID above into .env.local:"
echo "  LIVEKIT_SIP_TRUNK_ID=<your-trunk-id>"
echo "Verify with: lk sip outbound list"
