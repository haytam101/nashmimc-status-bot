require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder
} = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const SERVER_IP = process.env.SERVER_IP;
const SERVER_PORT = Number(process.env.SERVER_PORT || 25565);

const UPDATE_INTERVAL = 30 * 1000;

let statusMessage = null;

async function getMinecraftStatus() {
    try {
        const url =
            `https://api.mcstatus.io/v2/status/java/${SERVER_IP}:${SERVER_PORT}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`mcstatus.io returned ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error("Minecraft status error:", error.message);
        return null;
    }
}

function createOfflineEmbed() {

    return new EmbedBuilder()
        .setTitle("🔴 NashmiMC")
        .setDescription(
            "The Minecraft server is currently **OFFLINE**."
        )
        .addFields(
            {
                name: "📡 Status",
                value: "🔴 **OFFLINE**",
                inline: true
            },
            {
                name: "🌐 Server",
                value: `\`${SERVER_IP}:${SERVER_PORT}\``,
                inline: true
            }
        )
        .setTimestamp()
        .setFooter({
            text: "NashmiMC • Server Status"
        });
}

function createOnlineEmbed(data) {

    const playersOnline = data.players?.online ?? 0;
    const playersMax = data.players?.max ?? 0;

    let version = "Unknown";

    if (data.version?.name_clean) {
        version = data.version.name_clean;
    } else if (data.version?.name) {
        version = data.version.name;
    }

    return new EmbedBuilder()
        .setTitle("🟢 NashmiMC")
        .setDescription(
            "The Minecraft server is currently **ONLINE**."
        )
        .addFields(
            {
                name: "📡 Status",
                value: "🟢 **ONLINE**",
                inline: true
            },
            {
                name: "👥 Players",
                value: `**${playersOnline} / ${playersMax}**`,
                inline: true
            },
            {
                name: "🎮 Version",
                value: `\`${version}\``,
                inline: true
            },
            {
                name: "🌐 Server",
                value: `\`${SERVER_IP}:${SERVER_PORT}\``,
                inline: false
            }
        )
        .setTimestamp()
        .setFooter({
            text: "NashmiMC • Updates every 30 seconds"
        });
}

async function updateStatus() {

    try {

        const channel = await client.channels.fetch(CHANNEL_ID);

        if (!channel) {
            console.error("Discord channel not found.");
            return;
        }

        const data = await getMinecraftStatus();

        const embed = data?.online
            ? createOnlineEmbed(data)
            : createOfflineEmbed();

        if (!statusMessage) {

            const messages = await channel.messages.fetch({
                limit: 20
            });

            statusMessage = messages.find(
                message =>
                    message.author.id === client.user.id &&
                    message.embeds.length > 0 &&
                    message.embeds[0].footer?.text?.includes("NashmiMC")
            );
        }

        if (statusMessage) {

            await statusMessage.edit({
                embeds: [embed]
            });

        } else {

            statusMessage = await channel.send({
                embeds: [embed]
            });
        }

        console.log(
            `[STATUS] ${data?.online ? "ONLINE" : "OFFLINE"}`
        );

    } catch (error) {

        console.error("Update error:", error);

    }
}

client.once("ready", async () => {

    console.log(`Logged in as ${client.user.tag}`);

    await updateStatus();

    setInterval(updateStatus, UPDATE_INTERVAL);

});

client.login(DISCORD_TOKEN);
