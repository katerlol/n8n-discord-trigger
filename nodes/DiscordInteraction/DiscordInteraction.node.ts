import {
    type INodeType,
    type INodeExecutionData,
    type INodeTypeDescription,
    type INodePropertyOptions,
    type IExecuteFunctions,
    type INodeParameters,
    INodeOutputConfiguration,
    NodeOperationError,
    NodeConnectionType,
} from 'n8n-workflow';
import { options } from './DiscordInteraction.node.options';
import ipc from 'node-ipc';
import {
    connection,
    ICredentials,
    getChannels as getChannelsHelper,
    getRoles as getRolesHelper,
    getGuilds as getGuildsHelper,
} from '../helper';


export interface IDiscordInteractionMessageParameters {
    executionId: string;
    triggerPlaceholder: boolean;
    triggerChannel: boolean;
    channelId: string;
    embed: boolean;
    title: string;
    description: string;
    url: string;
    color: string;
    timestamp: string;
    footerText: string;
    footerIconUrl: string;
    imageUrl: string;
    thumbnailUrl: string;
    authorName: string;
    authorIconUrl: string;
    authorUrl: string;
    fields: {
        field?: {
            name: string;
            value: string;
            inline: boolean;
        }[];
    };
    mentionRoles: string[];
    content: string;
    files: {
        file?: {
            url: string;
        }[];
    };
}


export interface IDiscordNodeActionParameters {
    executionId: string;
    triggerPlaceholder: boolean;
    triggerChannel: boolean;
    channelId: string;
    guildId: string;
    apiKey: string;
    baseUrl: string;
    actionType: string;
    removeMessagesNumber: number;
    userId?: string;
    roleUpdateIds?: string[] | string;
}


const configuredOutputs = (parameters: INodeParameters) => {
    const mode = parameters.type as string;

    if (mode === 'confirm') {
        return [
            { displayName: 'confirm', type: 'main' },
            { displayName: 'cancel', type: 'main' },
            { displayName: 'no response', type: 'main' },
        ] as INodeOutputConfiguration[];
    } else {
        return [{ type: 'main' }] as INodeOutputConfiguration[];
    }
};


export class DiscordInteraction implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Discord Interaction',
        name: 'discordInteraction',
        group: ['discord'],
        version: 1,
        description: 'Sends messages, embeds and prompts to Discord',
        defaults: {
            name: 'Discord Interaction',
        },
        icon: 'file:discord-logo.svg',
        inputs: [NodeConnectionType.Main],
        outputs: `={{(${configuredOutputs})($parameter)}}`,
        credentials: [
            {
                name: 'discordBotTriggerApi',
                required: true,
            },
        ],
        properties: options,
    };

    methods = {
        loadOptions: {
            async getChannels(): Promise<INodePropertyOptions[]> {
                // @ts-ignore
                const selectedGuilds = this.getNodeParameter('guildIds', []);
                console.log("selectedGuilds", selectedGuilds);

                if (!selectedGuilds.length) {
                    // @ts-ignore
                    throw new NodeOperationError('Please select at least one server before choosing channels.');
                }

                return await getChannelsHelper(this, selectedGuilds).catch((e) => e);
            },
            async getRoles(): Promise<INodePropertyOptions[]> {
                // @ts-ignore
                const selectedGuilds = this.getNodeParameter('guildIds', []);
                console.log("selectedGuilds", selectedGuilds);

                if (!selectedGuilds.length) {
                    // @ts-ignore
                    throw new NodeOperationError('Please select at least one server before choosing channels.');
                }
                return await getRolesHelper(this, selectedGuilds).catch((e) => e);
            },
            async getGuilds(): Promise<INodePropertyOptions[]> {
                return await getGuildsHelper(this).catch((e) => e);
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

        // @ts-ignore
        const executionId = this.getExecutionId();

        // fetch credentials
        const credentials = (await this.getCredentials('discordBotTriggerApi').catch((e) => e)) as any as ICredentials;

        // create connection to bot.
        await connection(credentials).catch((e) => {
            console.log(e);
            if (this.getNodeParameter('type', 0) === 'confirm') {
                const returnData: INodeExecutionData[][] = [[], [], []];
                returnData[2] = this.getInputData();
                return returnData;
            } else {
                return this.prepareOutputData(this.getInputData());
            }
        });

        if (this.getNodeParameter('type', 0) === 'confirm') {
            const returnData: INodeExecutionData[][] = [[], [], []];
            // create connection to bot.
            await connection(credentials).catch((e) => {
                console.log(e);
                returnData[2] = this.getInputData();
                return returnData;
            });

            // Prepare the node parameters to send to the bot

            const nodeParameters: Record<string, any> = {};
            Object.keys(this.getNode().parameters).forEach((key) => {
                nodeParameters[key] = this.getNodeParameter(key, 0, '');
            });

            const response: any = await new Promise((resolve) => {
                ipc.config.retry = 1500;
                ipc.connectTo('bot', () => {
                    const type = `send:confirmation`;
                    ipc.of.bot.on(`callback:send:confirmation`, (data: any) => {
                        console.log("user decided", data);
                        resolve(data);
                    });

                    // send event to bot
                    ipc.of.bot.emit(type, nodeParameters);
                });
            });
            console.log(response);

            if (response.confirmed === null)
                returnData[2] = this.getInputData();
            else if(response.confirmed === true)
                returnData[0] = this.getInputData();
            else
                returnData[1] = this.getInputData();

            return returnData;

        } else {
            const returnData: INodeExecutionData[] = [];
            // iterate over all nodes
            const items: INodeExecutionData[] = this.getInputData();
            for (let itemIndex: number = 0; itemIndex < items.length; itemIndex++) {
                const nodeParameters: any = {};
                Object.keys(this.getNode().parameters).forEach((key) => {
                    nodeParameters[key] = this.getNodeParameter(key, itemIndex, '') as any;
                });
                nodeParameters.executionId = executionId;

                if (nodeParameters.channelId || nodeParameters.executionId) {
                    // return the interaction result if there is one
                    const res: any = new Promise((resolve) => {
                        ipc.config.retry = 1500;
                        ipc.connectTo('bot', () => {
                            const type = `send:${nodeParameters.type}`;
                            ipc.of.bot.on(`callback:${type}`, (data: any) => {
                                resolve(data);
                            });

                            // send event to bot
                            ipc.of.bot.emit(type, nodeParameters);
                        });
                    }).catch((e) => {
                        console.log(e);
                        return this.prepareOutputData(this.getInputData());
                    });

                    returnData.push({
                        json: {
                            value: res?.value,
                            channelId: res?.channelId,
                            userId: res?.userId,
                            userName: res?.userName,
                            userTag: res?.userTag,
                            messageId: res?.messageId,
                            action: res?.action,
                        },
                    });
                }
            }

            return this.prepareOutputData(returnData);
        }
    }
}
