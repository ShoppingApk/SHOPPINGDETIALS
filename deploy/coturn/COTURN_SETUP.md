# Run your own TURN server (coturn) on a free VM

**This is optional.** Kaasni calls work without it: with `TURN_PROVIDER=none` (STUN only) most calls between home Wi-Fi networks connect. A TURN server relays the call when the two devices can't reach each other directly. That's common on mobile data, office networks and some home routers. If calls fail on those networks, you need TURN.

Before choosing this route, consider the free hosted options in the main README (**Calls → TURN options**): Cloudflare and Metered. They take 5 minutes and need no server. Run your own coturn if you want full control, or if the hosted free limits aren't enough.

> **Card verification:** Oracle Cloud and Google Cloud both ask for a credit or debit card when you sign up, to verify your identity. Always Free resources are not charged, but **you** are responsible for staying inside the free limits. If you don't want to add a card, use Cloudflare or Metered instead (see README).

Privacy: media is end-to-end encrypted between the two browsers (DTLS-SRTP). The TURN server only forwards encrypted packets and can't hear or see the call.

---

## Which free VM?

| Provider | Free VM | Free outbound traffic | Verdict |
|---|---|---|---|
| **Oracle Cloud** (Always Free) | 1–4 Ampere A1 cores or 2 AMD micro VMs | **10 TB / month** | **Recommended.** Plenty for TURN. |
| Google Cloud (Free Tier) | 1 × e2-micro (us-west1, us-central1 or us-east1 only) | **1 GB / month** | Works, but 1 GB is roughly 2–3 hours of relayed video. Beyond that you are billed. |

Rough traffic use: a relayed voice call uses about **40 MB per hour**; a relayed 360p video call uses about **500 MB per hour**. Only calls that actually need the relay use it.

The steps below use **Oracle Cloud with Ubuntu 22.04 or 24.04**. Google Cloud differences are noted.

---

## Step 1: Create the VM

1. Sign up at <https://www.oracle.com/cloud/free/> and pick a **home region** near your users (e.g. India South / Mumbai). The home region can't be changed later.
2. Go to **Menu → Compute → Instances → Create instance**.
3. **Image:** *Canonical Ubuntu 22.04* (or 24.04). **Shape:** *VM.Standard.A1.Flex* with 1 OCPU and 6 GB RAM, or *VM.Standard.E2.1.Micro*. Both are "Always Free eligible".
4. **Networking:** keep the default VCN and make sure **Assign a public IPv4 address** is selected.
5. **SSH keys:** choose *Generate a key pair for me* and **download the private key**.
6. Click **Create** and wait until the state is **Running**. Note the **Public IP address**.

*Google Cloud:* **Compute Engine → VM instances → Create**. Use machine type **e2-micro** in us-west1, us-central1 or us-east1, the **Ubuntu 22.04** boot image, and the **standard** network tier.

## Step 2: Open the firewall ports

coturn needs these ports open **from anywhere (0.0.0.0/0)**:

| Port(s) | Protocol | Why |
|---|---|---|
| 3478 | UDP **and** TCP | TURN/STUN (main) |
| 49160–49260 | UDP | Relay ports for calls |
| 5349 | TCP | TURN over TLS (optional, step 9) |
| 443 | TCP | TURN over TLS on 443 (optional, strict networks only) |

**Oracle Cloud** has two firewalls, and you must open **both**:

1. **Cloud firewall:** Instance page → click the **Subnet** → **Security Lists** → *Default Security List* → **Add Ingress Rules**. Add one rule per row of the table above: Source CIDR `0.0.0.0/0`, the IP protocol, and the destination port range (e.g. `49160-49260`).
2. **Firewall inside Ubuntu:** Oracle's Ubuntu images block everything except SSH. SSH in (step 3), then run:

   ```bash
   sudo iptables -I INPUT 6 -p udp --dport 3478 -j ACCEPT
   sudo iptables -I INPUT 6 -p tcp --dport 3478 -j ACCEPT
   sudo iptables -I INPUT 6 -p udp --dport 49160:49260 -j ACCEPT
   sudo iptables -I INPUT 6 -p tcp --dport 5349 -j ACCEPT
   sudo netfilter-persistent save
   ```

**Google Cloud:** **VPC network → Firewall → Create firewall rule**. Set Targets to *All instances*, Source `0.0.0.0/0`, then add `tcp:3478,5349` and `udp:3478,49160-49260`. Ubuntu on Google Cloud has no extra firewall.

## Step 3: Connect to the VM

On Windows (PowerShell), macOS or Linux:

```bash
ssh -i path/to/downloaded-key.key ubuntu@YOUR_PUBLIC_IP
```

(On Google Cloud you can use the **SSH** button in the console instead.) If Windows complains about key permissions, right-click the key file → Properties → Security, and leave only your own user with access.

## Step 4: Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo docker --version
```

## Step 5: Copy the coturn folder

Either clone your repository:

```bash
git clone https://github.com/YOUR_USER/YOUR_REPO.git kaasni
cd kaasni/deploy/coturn
```

or copy only this folder from your computer: `scp -i key.key -r deploy/coturn ubuntu@YOUR_PUBLIC_IP:~/coturn`

## Step 6: Create the .env file

```bash
cp .env.example .env
openssl rand -hex 32      # copy the output: this is your shared secret
hostname -I               # the first address is the VM's PRIVATE IP
nano .env
```

Fill in:

```ini
TURN_SHARED_SECRET=the_64_character_value_from_openssl
EXTERNAL_IP=YOUR_PUBLIC_IP/YOUR_PRIVATE_IP     # e.g. 140.238.10.20/10.0.0.15
TURN_REALM=kaasni
```

Save with **Ctrl+O**, press Enter, then exit with **Ctrl+X**. Keep the secret private: anyone with it can use your server.

## Step 7: Start coturn

```bash
sudo docker compose up -d
sudo docker compose logs -f      # Ctrl+C to stop watching
```

You should see lines like `Listener address to use: ...` and `IPv4. UDP listener opened on: ...:3478`. A warning about the missing certificate files is fine if you skip TLS.

coturn restarts automatically after a reboot (`restart: unless-stopped`).

## Step 8: Connect Kaasni (Render)

In Render, open your API service → **Environment**, add the following, and save. Render restarts the service.

| Key | Value |
|---|---|
| `TURN_PROVIDER` | `coturn-secret` |
| `TURN_SHARED_SECRET` | the **same** secret as in the VM's `.env` |
| `TURN_URLS` | `turn:YOUR_PUBLIC_IP:3478?transport=udp,turn:YOUR_PUBLIC_IP:3478?transport=tcp` |

With TLS (step 9), append `,turns:turn.your-domain.com:5349?transport=tcp` (and/or `:443`).

The backend now gives each caller a username and password that are valid for **1 hour**, signed with the secret. The secret itself never reaches the browser. Nothing changes on Vercel or Netlify.

## Step 9 (optional): TLS for strict networks

Some office and mobile networks block everything except HTTPS (TCP 443). TURN over TLS on 443 gets through those.

1. You need a domain name pointing at the VM. A free one from <https://www.duckdns.org> works (e.g. `kaasni-turn.duckdns.org` → your public IP).
2. Get a free certificate with Let's Encrypt. Port 80 must be open temporarily: add TCP 80 in both firewalls, as in step 2.

   ```bash
   sudo apt-get install -y certbot
   sudo certbot certonly --standalone -d kaasni-turn.duckdns.org
   sudo cp /etc/letsencrypt/live/kaasni-turn.duckdns.org/fullchain.pem certs/
   sudo cp /etc/letsencrypt/live/kaasni-turn.duckdns.org/privkey.pem certs/
   sudo chmod 644 certs/*.pem
   ```

3. To use port 443 too, uncomment `alt-tls-listening-port=443` in `turnserver.conf` and open TCP 443 in both firewalls.
4. Restart coturn with `sudo docker compose restart`.
5. On Render, add `turns:kaasni-turn.duckdns.org:5349?transport=tcp` (and/or `:443`) to `TURN_URLS`.

Certificates expire after 90 days. Renew them with `sudo certbot renew`, copy the files again, and restart coturn. You can do this monthly with a cron job.

## Step 10: Test it

1. **In Kaasni:** open the private area → **Settings → Call test**. It should say **"TURN relay is working"** and list a *relay* candidate.
2. **Independent check:** open <https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/>. Generate a test username and password on your computer:

   ```bash
   node -e "const c=require('crypto');const u=Math.floor(Date.now()/1000)+3600+':test';console.log('username:',u);console.log('password:',c.createHmac('sha1',process.argv[1]).update(u).digest('base64'))" YOUR_SHARED_SECRET
   ```

   Add `turn:YOUR_PUBLIC_IP:3478` with that username and password, then click **Gather candidates**. A row with type **relay** means it works.
3. **Real call:** put one phone on mobile data and the other device on Wi-Fi, and make a video call.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Call test shows no *relay* candidate | Check that both firewalls are open (step 2), especially Oracle's iptables. Check that `TURN_SHARED_SECRET` is identical on Render and the VM. Check that `TURN_URLS` has the public IP. |
| `401 Unauthorized` in coturn logs | The secrets don't match, or the VM clock is wrong. Run `timedatectl` and check that NTP is active. |
| Relay found but no audio/video | The UDP relay range 49160–49260 is not open, or `EXTERNAL_IP` is missing the `/PRIVATE_IP` part. |
| Works on Wi-Fi, fails on some mobile networks | Add TURN over TLS on 443 (step 9). |
| VM runs out of bandwidth (Google Cloud) | Move to Oracle Cloud (10 TB free), or use Cloudflare or Metered. |

Useful commands:

```bash
sudo docker compose ps          # is it running?
sudo docker compose logs --tail 100
sudo docker compose restart
sudo docker compose pull && sudo docker compose up -d   # update coturn
```

**Security:** the config already refuses to relay into private networks (`denied-peer-ip`), limits allocations (`total-quota`, `user-quota`) and bandwidth per session (`max-bps`), and disables the admin CLI. To rotate the secret, change it in `.env` and on Render at the same time, then run `sudo docker compose up -d`.
