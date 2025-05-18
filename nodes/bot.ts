import {
    Client, GatewayIntentBits, ChannelType, Guild,
    EmbedBuilder,
    ColorResolvable,
    AttachmentBuilder,
    TextChannel,
    Message,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Partials,
} from 'discord.js';

import ipc from 'node-ipc';
import {
    ICredentials,
} from './helper';
import settings from './settings';
import { IDiscordInteractionMessageParameters, IDiscordNodeActionParameters } from './DiscordInteraction/DiscordInteraction.node';

export default function () {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageReactions,
            GatewayIntentBits.MessageContent,
        ],
        allowedMentions: {
            parse: ['roles', 'users', 'everyone'],
        },
        partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
    });

    ipc.config.id = 'bot';
    ipc.config.retry = 1500;
    ipc.config.silent = true;

    client.once('ready', () => {
        console.log(`Logged in as ${client.user?.tag}`);
        client.on('messageCreate', onMessageCreate);
    });

    client.on('guildMemberAdd', (guildMember) => {
        for (const [nodeId, parameters] of Object.entries(settings.triggerNodes) as [string, any]) {
            try {
                if ('user-join' !== parameters.type)
                    continue;

                if (parameters.guildIds.length && !parameters.guildIds.includes(guildMember.guild.id))
                    continue;

                ipc.server.emit(parameters.socket, 'guildMemberAdd', {
                    guildMember: guildMember,
                    guild: guildMember.guild,
                    user: guildMember.user,
                    nodeId: nodeId
                });

            } catch (e) {
                console.log(e);
            }
        }
    });

    client.on('guildMemberRemove', (guildMember) => {
        for (const [nodeId, parameters] of Object.entries(settings.triggerNodes) as [string, any]) {
            try {
                if ('user-leave' !== parameters.type)
                    continue;

                if (parameters.guildIds.length && !parameters.guildIds.includes(guildMember.guild.id))
                    continue;

                ipc.server.emit(parameters.socket, 'guildMemberRemove', {
                    guildMember: guildMember,
                    guild: guildMember.guild,
                    user: guildMember.user,
                    nodeId: nodeId
                });

            } catch (e) {
                console.log(e);
            }
        }
    });

    client.on('messageReactionAdd', async (messageReaction, user) => {
        let message : any = null;

        for (const [nodeId, parameters] of Object.entries(settings.triggerNodes) as [string, any]) {
            try {
                if ('message-reaction-add' !== parameters.type)
                    continue;

                if (!message) {
                    // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
                    try {
                        await messageReaction.fetch();
                        message = messageReaction.message;
                    } catch (error) {
                        console.error('Something went wrong when fetching the message:', error);
                        continue;
                    }
                }

                // ignore messageReactions of other bots
                const triggerOnExternalBot = parameters.additionalFields?.externalBotTrigger || false;
                if (!triggerOnExternalBot) {
                    if (user.bot || user.system) continue;
                }
                else if (user.id === message.client.user.id) continue;

                if (parameters.guildIds.length && message.guild && !parameters.guildIds.includes(message.guild.id))
                    continue;

                if (parameters.messageIds.length && !parameters.messageIds.includes(message.id))
                    continue;


                // check if executed by the proper channel
                if (parameters.channelIds.length) {
                    const isInChannel = parameters.channelIds.some((channelId: any) => message.channel.id?.includes(channelId));
                    if (!isInChannel) continue;
                }

                // check if executed by the proper role
                const userRoles = message.member?.roles.cache.map((role: any) => role.id);
                if (parameters.roleIds.length) {
                    const hasRole = parameters.roleIds.some((role: any) => userRoles?.includes(role));
                    if (!hasRole) continue;
                }

                ipc.server.emit(parameters.socket, 'messageReactionAdd', {
                    messageReaction: messageReaction,
                    message: message,
                    user: user,
                    guild: message.guild,
                    nodeId: nodeId
                });

            } catch (e) {
                console.log(e);
            }
        }
    });

    client.on('messageReactionRemove', async (messageReaction, user) => {
        let message : any = null;

        for (const [nodeId, parameters] of Object.entries(settings.triggerNodes) as [string, any]) {
            try {

                if ('message-reaction-remove' !== parameters.type)
                    continue;


                if (!message) {
                    try {
                        await messageReaction.fetch();
                        message = messageReaction.message;
                    } catch (error) {
                        console.error('Something went wrong when fetching the message:', error);
                        continue;
                    }
                }

                // ignore messageReactions of other bots
                const triggerOnExternalBot = parameters.additionalFields?.externalBotTrigger || false;
                if (!triggerOnExternalBot) {
                    if (user.bot || user.system) continue;
                }
                else if (user.id === message.client.user.id) continue;

                if (parameters.guildIds.length && message.guild && !parameters.guildIds.includes(message.guild.id))
                    continue;

                if (parameters.messageIds.length && !parameters.messageIds.includes(message.id))
                    continue;

                // check if executed by the proper channel
                if (parameters.channelIds.length) {
                    const isInChannel = parameters.channelIds.some((channelId: any) => message.channel.id?.includes(channelId));
                    if (!isInChannel) continue;
                }

                // check if executed by the proper role
                const userRoles = message.member?.roles.cache.map((role: any) => role.id);
                if (parameters.roleIds.length) {
                    const hasRole = parameters.roleIds.some((role: any) => userRoles?.includes(role));
                    if (!hasRole) continue;
                }

                ipc.server.emit(parameters.socket, 'messageReactionRemove', {
                    messageReaction: messageReaction,
                    message: message,
                    user: user,
                    guild: message.guild,
                    nodeId: nodeId
                });

            } catch (e) {
                console.log(e);
            }
        }
    });

    client.on('roleCreate', (role) => {
        for (const [nodeId, parameters] of Object.entries(settings.triggerNodes) as [string, any]) {
            try {
                if ('role-create' !== parameters.type)
                    continue;

                if (parameters.guildIds.length && !parameters.guildIds.includes(role.guild.id))
                    continue;

                ipc.server.emit(parameters.socket, 'roleCreate', {
                    role: role,
                    guild: role.guild,
                    nodeId: nodeId
                });

            } catch (e) {
                console.log(e);
            }
        }
    });

    client.on('roleDelete', (role) => {
        for (const [nodeId, parameters] of Object.entries(settings.triggerNodes) as [string, any]) {
            try {
                if ('role-delete' !== parameters.type)
                    continue;

                if (parameters.guildIds.length && !parameters.guildIds.includes(role.guild.id))
                    continue;

                ipc.server.emit(parameters.socket, 'roleDelete', {
                    role: role,
                    guild: role.guild,
                    nodeId: nodeId
                });

            } catch (e) {
                console.log(e);
            }
        }
    });

    client.on('roleUpdate', (oldRole, newRole) => {
        if (
            oldRole.name === newRole.name &&
            oldRole.color === newRole.color &&
            oldRole.hoist === newRole.hoist &&
            oldRole.permissions.bitfield === newRole.permissions.bitfield &&
            oldRole.mentionable === newRole.mentionable &&
            oldRole.icon === newRole.icon &&
            oldRole.unicodeEmoji === newRole.unicodeEmoji
        ) {
            return; // Skip processing if no meaningful changes were made
        }

        for (const [nodeId, parameters] of Object.entries(settings.triggerNodes) as [string, any]) {
            try {
                if ('role-update' !== parameters.type)
                    continue;

                if (parameters.guildIds.length && !parameters.guildIds.includes(oldRole.guild.id))
                    continue;

                ipc.server.emit(parameters.socket, 'roleUpdate', {
                    oldRole,
                    newRole,
                    guild: oldRole.guild,
                    nodeId: nodeId
                });

            } catch (e) {
                console.log(e);
            }
        }
    });

    // whenever a message is created this listener is called
    const onMessageCreate = async (message: Message) => {

        // resolve the message reference if it exists
        let messageReference: Message | null = null;
        let messageRerenceFetched = !(message.reference);

        // iterate through all nodes and see if we need to trigger some
        for (const [nodeId, parameters] of Object.entries(settings.triggerNodes) as [string, any]) {
            try {
                // Check if this is a direct message or a regular message type
                const isDirectMessage = message.channel.type === ChannelType.DM;

                // Skip if this node doesn't match the message type
                if (parameters.type === 'direct-message' && !isDirectMessage) continue;
                if (parameters.type === 'message' && isDirectMessage) continue;
                if (parameters.type !== 'message' && parameters.type !== 'direct-message') continue;

                const pattern = parameters.pattern;

                const triggerOnExternalBot = parameters.additionalFields?.externalBotTrigger || false;
                const onlyWithAttachments = parameters.additionalFields?.attachmentsRequired || false;

                // ignore messages of other bots
                if (!triggerOnExternalBot) {
                    if (message.author.bot || message.author.system) continue;
                }
                else if (message.author.id === message.client.user.id) continue;

                // For guild messages, check guild ID filter (skip for direct messages)
                if (!isDirectMessage && parameters.guildIds.length && message.guild && !parameters.guildIds.includes(message.guild.id))
                    continue;

                // check if executed by the proper role (skip for direct messages)
                const userRoles = !isDirectMessage ? message.member?.roles.cache.map((role: any) => role.id) : [];
                if (!isDirectMessage && parameters.roleIds.length) {
                    const hasRole = parameters.roleIds.some((role: any) => userRoles?.includes(role));
                    if (!hasRole) continue;
                }

                // check if executed by the proper channel (skip for direct messages)
                if (!isDirectMessage && parameters.channelIds.length) {
                    const isInChannel = parameters.channelIds.some((channelId: any) => message.channel.id?.includes(channelId));
                    if (!isInChannel) continue;
                }

                // check if the message has to have a message that was responded to
                if (parameters.messageReferenceRequired && !message.reference) {
                    continue;
                }

                // fetch the message reference only once and only if needed, even if multiple triggers are installed
                if (!messageRerenceFetched) {
                    messageReference = await message.fetchReference();
                    messageRerenceFetched = true;
                }


                // escape the special chars to properly trigger the message
                const escapedTriggerValue = String(parameters.value)
                    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
                    .replace(/-/g, '\\x2d');

                const clientId = client.user?.id;
                const botMention = message.mentions.users.some((user: any) => user.id === clientId);

                let regStr = `^${escapedTriggerValue}$`;

                // return if we expect a bot mention, but bot is not mentioned
                if (pattern === "botMention" && !botMention)
                    continue;

                else if (pattern === "start" && message.content)
                    regStr = `^${escapedTriggerValue}`;
                else if (pattern === 'end')
                    regStr = `${escapedTriggerValue}$`;
                else if (pattern === 'contain')
                    regStr = `${escapedTriggerValue}`;
                else if (pattern === 'regex')
                    regStr = `${parameters.value}`;
                else if (pattern === 'every')
                    regStr = `(.*)`;

                const reg = new RegExp(regStr, parameters.caseSensitive ? '' : 'i');

                if ((pattern === "botMention" && botMention) || reg.test(message.content)) {
                    // Emit the message data to n8n

                    // message create Options
                    const messageCreateOptions : any = {
                        message,
                        messageReference,
                        guild: message?.guild,
                        referenceAuthor: messageReference?.author,
                        author: message.author,
                        nodeId: nodeId,
                    }

                    // check attachments
                    if (onlyWithAttachments && !message.attachments) continue;

                    console.log("attachments", message.attachments);
                    messageCreateOptions.attachments = message.attachments;

                    ipc.server.emit(parameters.socket, 'messageCreate', messageCreateOptions);
                }

            } catch (e) {
                console.log(e);
            }
        }
    };

    // nodes are executed in a child process, the Discord bot is executed in the main process
    // so it's not stopped when a node execution end
    // we use ipc to communicate between the node execution process and the bot
    // ipc is serving in the main process & childs connect to it using the ipc client
    ipc.serve(function () {
        console.log(`ipc bot server started`);

        ipc.server.on('triggerNodeRegistered', (data: any, socket: any) => {

            // set the specific node parameters for a later iteration when we get messages
            settings.triggerNodes[data.nodeId] = {
                ...data.parameters, // deconscruct and add socket for later
                socket: socket,
            };
        });

        ipc.server.on('triggerNodeRemoved', (data: { nodeId: string }, socket: any) => {
            console.log(`Removing trigger node: ${data.nodeId}`);
            if (settings.triggerNodes[data.nodeId]) {
                delete settings.triggerNodes[data.nodeId];
            }
        });


        ipc.server.on('list:roles', (guildIds: string[], socket: any) => {
            try {
                if (settings.ready) {
                    const guilds = client.guilds.cache.filter(guild => guildIds.includes(`${guild.id}`));
                    const rolesList = [] as { name: string; value: string }[];

                    for (const guild of guilds.values()) {
                        const roles = guild.roles.cache ?? ([]);
                        for (const role of roles.values()) {
                            rolesList.push({
                                name: role.name,
                                value: role.id,
                            })
                        }
                    }

                    ipc.server.emit(socket, 'list:roles', rolesList);
                }
            } catch (e) {
                console.log(`${e}`);
            }
        });



        ipc.server.on('list:guilds', (data: undefined, socket: any) => {
            try {
                if (settings.ready) {

                    const guilds = client.guilds.cache ?? ([] as any);
                    const guildsList = guilds.map((guild: Guild) => {
                        return {
                            name: guild.name,
                            value: guild.id,
                        };
                    });

                    ipc.server.emit(socket, 'list:guilds', guildsList);
                }
            } catch (e) {
                console.log(`${e}`);
            }
        });



        ipc.server.on('list:channels', (guildIds: string[], socket: any) => {
            try {
                if (settings.ready) {
                    const guilds = client.guilds.cache.filter(guild => guildIds.includes(`${guild.id}`));
                    const channelsList = [] as { name: string; value: string }[];

                    for (const guild of guilds.values()) {
                        const channels = guild.channels.cache.filter((channel: any) => channel.type === ChannelType.GuildText) ?? ([] as any) as any;
                        for (const channel of channels.values()) {
                            channelsList.push({
                                name: channel.name,
                                value: channel.id,
                            })
                        }
                    }

                    console.log(channelsList);

                    ipc.server.emit(socket, 'list:channels', channelsList);
                }
            } catch (e) {
                console.log(`${e}`);
            }
        });




        ipc.server.on('credentials', (data: ICredentials, socket: any) => {
            try {
                if (
                    (!settings.login && !settings.ready) ||
                    (settings.ready && (settings.clientId !== data.clientId || settings.token !== data.token))
                ) {
                    if (data.token && data.clientId) {
                        settings.login = true;
                        client.destroy();
                        client
                            .login(data.token)
                            .then(() => {
                                // set token for rest api aswell
                                client.rest.setToken(data.token);

                                settings.ready = true;
                                settings.login = false;
                                settings.clientId = data.clientId;
                                settings.token = data.token;
                                console.log("Client token2: ", client.isReady());
                                ipc.server.emit(socket, 'credentials', 'ready');
                            })
                            .catch((e) => {
                                settings.login = false;
                                ipc.server.emit(socket, 'credentials', 'error');
                            });
                    } else {
                        ipc.server.emit(socket, 'credentials', 'missing');
                        console.log(`credentials missing`);
                    }
                } else if (settings.login) {
                    ipc.server.emit(socket, 'credentials', 'login');
                    console.log(`credentials login`);
                } else {
                    ipc.server.emit(socket, 'credentials', 'already');
                }
            } catch (e) {
                console.log(`${e}`);
            }
        });

        ipc.server.on('send:message', async (nodeParameters: IDiscordInteractionMessageParameters, socket: any) => {
            try {
                if (settings.ready) {

                    // fetch channel
                    const channel = <TextChannel>client.channels.cache.get(nodeParameters.channelId);
                    if (!channel || !channel.isTextBased()) return;

                    const preparedMessage = prepareMessage(nodeParameters);

                    // finally send the message and report back to the listener
                    const message = await channel.send(preparedMessage);
                    ipc.server.emit(socket, 'callback:send:message', {
                        channelId: channel.id,
                        messageId: message.id
                    });
                }
            } catch (e) {
                console.log(`${e}`);
                ipc.server.emit(socket, 'callback:send:message', false);
            }
        });


        ipc.server.on('send:action', async (nodeParameters: IDiscordNodeActionParameters, socket: any) => {
            try {
                if (settings.ready) {
                    const performAction = async () => {
                        // remove messages
                        if (nodeParameters.actionType === 'removeMessages') {
                            const channel = <TextChannel>client.channels.cache.get(nodeParameters.channelId);
                            if (!channel || !channel.isTextBased()) {
                                ipc.server.emit(socket, `callback:send:action`, false);;
                                return;
                            }

                            await channel.bulkDelete(nodeParameters.removeMessagesNumber).catch((e: any) => console.log(`${e}`, client));
                        }

                        // add or remove roles
                        else if (['addRole', 'removeRole'].includes(nodeParameters.actionType)) {
                            const guild = await client.guilds.cache.get(nodeParameters.guildId);
                            if (!guild) {
                                ipc.server.emit(socket, `callback:send:action`, false);
                                return;
                            }

                            const user = await client.users.fetch(nodeParameters.userId as string);
                            const guildMember = await guild.members.fetch(user);
                            const roles = guildMember.roles;

                            // Split the roles that are set in the parameters into individual ones or initialize as empty if no roles are set.
                            const roleUpdateIds = (typeof nodeParameters.roleUpdateIds === 'string' ? nodeParameters.roleUpdateIds.split(',') : nodeParameters.roleUpdateIds) ?? [];
                            for (const roleId of roleUpdateIds) {
                                if (!roles.cache.has(roleId) && nodeParameters.actionType === 'addRole')
                                    roles.add(roleId);
                                else if (roles.cache.has(roleId) && nodeParameters.actionType === 'removeRole')
                                    roles.remove(roleId);
                            }
                        }
                    };

                    await performAction();
                    console.log("action done");

                    ipc.server.emit(socket, `callback:send:action`, {
                        action: nodeParameters.actionType,
                    });
                }

            } catch (e) {
                console.log(`${e}`);
                ipc.server.emit(socket, `callback:send:action`, false);
            }
        });


        ipc.server.on('send:confirmation', async (nodeParameters: any, socket: any) => {
            try {
                if (settings.ready) {
                    // fetch channel
                    const channel = <TextChannel>client.channels.cache.get(nodeParameters.channelId);
                    if (!channel || !channel.isTextBased()) return;

                    let confirmationMessage: Message | null = null;

                    let collectorTimeout = 60 * 1000; // 1 minute
                    if (nodeParameters.additionalConfirmationFields.timeout > 0) {
                        collectorTimeout = parseInt(nodeParameters.additionalConfirmationFields.timeout) * 1000;
                    }

                    // prepare embed messages, if they are set by the client
                    const confirmed = await new Promise<Boolean | null>(async resolve => {
                        const preparedMessage = prepareMessage(nodeParameters);
                        // @ts-ignore
                        prepareMessage.ephemeral = true;

                        const collector = channel.createMessageComponentCollector({
                            max: 1, // The number of times a user can click on the button
                            time: collectorTimeout, // The amount of time the collector is valid for in milliseconds,
                        });
                        let isResolved = false;
                        collector.on("collect", (interaction) => {

                            if (interaction.customId === "yes") {
                                interaction.message.delete();
                                isResolved = true;
                                return resolve(true);
                            } else if (interaction.customId === "no") {
                                interaction.message.delete();
                                isResolved = true;
                                return resolve(false);
                            }

                            interaction.message.delete();
                            isResolved = true;
                            resolve(null);
                        });

                        collector.on("end", (collected) => {
                            if (!isResolved)
                                resolve(null);
                            confirmationMessage?.delete();
                            throw Error("Confirmed message could not be resolved");
                        });

                        preparedMessage.components = [new ActionRowBuilder().addComponents([
                            new ButtonBuilder()
                                .setCustomId(`yes`)
                                .setLabel('Yes')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId('no')
                                .setLabel('No')
                                .setStyle(ButtonStyle.Danger),
                        ])];

                        confirmationMessage = await channel.send(preparedMessage);
                    });

                    console.log("sending callback to node ", confirmed);
                    ipc.server.emit(socket, 'callback:send:confirmation', { confirmed: confirmed, success: true });
                }
            } catch (e) {
                console.log(`${e}`);
                ipc.server.emit(socket, 'callback:send:confirmation', { confirmed: null, success: true });
            }
        });
    });

    ipc.server.start();
}

function prepareMessage(nodeParameters: any): any {
    // prepare embed messages, if they are set by the client
    const embedFiles = [];
    let embed: EmbedBuilder | undefined;
    if (nodeParameters.embed) {
        embed = new EmbedBuilder();
        if (nodeParameters.title) embed.setTitle(nodeParameters.title);
        if (nodeParameters.url) embed.setURL(nodeParameters.url);
        if (nodeParameters.description) embed.setDescription(nodeParameters.description);
        if (nodeParameters.color) embed.setColor(nodeParameters.color as ColorResolvable);
        if (nodeParameters.timestamp)
            embed.setTimestamp(Date.parse(nodeParameters.timestamp));
        if (nodeParameters.footerText) {
            let iconURL = nodeParameters.footerIconUrl;
            if (iconURL && iconURL.match(/^data:/)) {
                const buffer = Buffer.from(iconURL.split(',')[1], 'base64');
                const reg = new RegExp(/data:image\/([a-z]+);base64/gi);
                let mime = reg.exec(nodeParameters.footerIconUrl) ?? [];
                const file = new AttachmentBuilder(buffer, { name: `footer.${mime[1]}` });
                embedFiles.push(file);
                iconURL = `attachment://footer.${mime[1]}`;
            }
            embed.setFooter({
                text: nodeParameters.footerText,
                ...(iconURL ? { iconURL } : {}),
            });
        }
        if (nodeParameters.imageUrl) {
            if (nodeParameters.imageUrl.match(/^data:/)) {
                const buffer = Buffer.from(nodeParameters.imageUrl.split(',')[1], 'base64');
                const reg = new RegExp(/data:image\/([a-z]+);base64/gi);
                let mime = reg.exec(nodeParameters.imageUrl) ?? [];
                const file = new AttachmentBuilder(buffer, { name: `image.${mime[1]}` });
                embedFiles.push(file);
                embed.setImage(`attachment://image.${mime[1]}`);
            } else embed.setImage(nodeParameters.imageUrl);
        }
        if (nodeParameters.thumbnailUrl) {
            if (nodeParameters.thumbnailUrl.match(/^data:/)) {
                const buffer = Buffer.from(nodeParameters.thumbnailUrl.split(',')[1], 'base64');
                const reg = new RegExp(/data:image\/([a-z]+);base64/gi);
                let mime = reg.exec(nodeParameters.thumbnailUrl) ?? [];
                const file = new AttachmentBuilder(buffer, { name: `thumbnail.${mime[1]}` });
                embedFiles.push(file);
                embed.setThumbnail(`attachment://thumbnail.${mime[1]}`);
            } else embed.setThumbnail(nodeParameters.thumbnailUrl);
        }
        if (nodeParameters.authorName) {
            let iconURL = nodeParameters.authorIconUrl;
            if (iconURL && iconURL.match(/^data:/)) {
                const buffer = Buffer.from(iconURL.split(',')[1], 'base64');
                const reg = new RegExp(/data:image\/([a-z]+);base64/gi);
                let mime = reg.exec(nodeParameters.authorIconUrl) ?? [];
                const file = new AttachmentBuilder(buffer, { name: `author.${mime[1]}` });
                embedFiles.push(file);
                iconURL = `attachment://author.${mime[1]}`;
            }
            embed.setAuthor({
                name: nodeParameters.authorName,
                ...(iconURL ? { iconURL } : {}),
                ...(nodeParameters.authorUrl ? { url: nodeParameters.authorUrl } : {}),
            });
        }
        if (nodeParameters.fields?.field) {
            nodeParameters.fields.field.forEach(
                (field: { name?: string; value?: string; inline?: boolean }) => {
                    if (embed && field.name && field.value)
                        embed.addFields({
                            name: field.name,
                            value: field.value,
                            inline: field.inline,
                        });
                    else if (embed) embed.addFields({ name: '\u200B', value: '\u200B' });
                },
            );
        }
    }

    // add all the mentions at the end of the message
    let mentions = '';
    nodeParameters.mentionRoles.forEach((role: string) => {
        mentions += ` <@&${role}>`;
    });

    let content = '';
    if (nodeParameters.content) content += nodeParameters.content;
    if (mentions) content += mentions;

    // if there are files, add them aswell
    let files: any[] = [];
    if (nodeParameters.files?.file) {
        files = nodeParameters.files?.file.map((file: { url: string }) => {
            if (file.url.match(/^data:/)) {
                return Buffer.from(file.url.split(',')[1], 'base64');
            }
            return file.url;
        });
    }
    if (embedFiles.length) files = files.concat(embedFiles);

    // prepare the message object how discord likes it
    const sendObject = {
        content: content ?? '',
        ...(embed ? { embeds: [embed] } : {}),
        ...(files.length ? { files } : {}),
    };

    return sendObject;
}
