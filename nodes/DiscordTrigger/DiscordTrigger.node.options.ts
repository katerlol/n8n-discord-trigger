import { INodeProperties } from 'n8n-workflow';

export const options: INodeProperties[] = [
  {
    displayName: 'Trigger Type',
    name: 'type',

    type: 'options',
    options: [
      {
        name: 'Message',
        value: 'message',
        description: 'When a message is sent in the selected channels',
      },
      {
        name: 'Direct Message',
        value: 'direct-message',
        description: 'When a direct message is sent to the bot',
      },
      {
				name: 'Reaction Add',
				value: 'message-reaction-add',
				description: 'When a reaction is added to a message on the server',
			},
      {
				name: 'Reaction Remove',
				value: 'message-reaction-remove',
				description: 'When a reaction is removed from a message on the server',
			},
      {
				name: 'Role Add',
				value: 'role-create',
				description: 'When a new role is created on the server',
			},
			{
				name: 'Role Delete',
				value: 'role-delete',
				description: 'When a role is deleted on the server',
			},
			{
				name: 'Role Update',
				value: 'role-update',
				description: 'When an existing role is updated on the server',
			},
      {
				name: 'User Join',
				value: 'user-join',
				description: 'When a user joins the server',
			},
			{
				name: 'User Leave',
				value: 'user-leave',
				description: 'When a user leaves the server',
			},
    ],
    default: 'message',
    description: 'Type of event to listen to. User events must specify a channel to listen to if you want to use a placeholder or the option "send to the trigger channel" in a Discord Send node.',
  },
  {
    displayName: 'Server Names or IDs',
    name: 'guildIds',
    placeholder: 'e.g. my-server',
    type: 'multiOptions',
    displayOptions: {
      show: {
        type: ['message', 'user-join', 'user-leave', 'message-reaction-add', 'message-reaction-remove', 'role-create', 'role-delete', 'role-update'],
      },
    },
    typeOptions: {
      loadOptionsMethod: 'getGuilds',
    },
    default: [],
    description: 'Lets you specify whether you want to listen one or more specific discord servers. Choose from the list, or specify an ID. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
  },
  {
    displayName: 'Listen To Channels',
    name: 'channelIds',
    placeholder: 'e.g. my-channel',
    type: 'multiOptions',
    typeOptions: {
      loadOptionsDependsOn: ['guildIds'],
      loadOptionsMethod: 'getChannels',
    },
    displayOptions: {
      show: {
        type: ['message', 'message-reaction-add', 'message-reaction-remove'],
      },
    },
    default: [],
    description: 'Lets you select the text channels you want to listen to for triggering the workflow. If none selected, all channels will be listen to. Your credentials must be set and the bot running, you also need at least one text channel available. If you do not meet these requirements, make the changes then close and reopen the modal (the channels list is loaded when the modal opens). Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
  },
  {
    displayName: 'Listen to Roles',
    placeholder: 'e.g. my-role',
    name: 'roleIds',

    type: 'multiOptions',
    displayOptions: {
      show: {
        type: ['message', 'message-reaction-add', 'message-reaction-remove'],
      },
    },
    typeOptions: {
      loadOptionsDependsOn: ['guildIds'],
      loadOptionsMethod: 'getRoles',
    },
    default: [],
    description: 'The same logic apply here for roles, except it is optional. If you don\'t select any role it will listen to @everyone. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
  },
  {
    displayName: 'Listen to Message',
    placeholder: 'e.g. 1366875632994232201',
    name: 'messageIds',
    type: 'string',
    displayOptions: {
      show: {
        type: ['message-reaction-add', 'message-reaction-remove'],
      },
    },
    default: '',
    description: 'If entered the reaction will only trigger on the predefined messages',
  },
  {
    displayName: 'Pattern',
    name: 'pattern',

    type: 'options',
    displayOptions: {
      show: {
        type: ['message', 'direct-message'],
      },
    },
    options: [
      {
        name: 'Bot Mention',
        value: 'botMention',
        description: 'The bot has to be mentioned somewhere in the message in order to trigger',
      },
      {
        name: 'Contains',
        value: 'contain',
        description: 'Match the value in any position in the message',
      },
      {
        name: 'Ends With',
        value: 'end',
        description: 'Match the message ending with the specified value',
      },
      {
        name: 'Equals',
        value: 'equal',
        description: 'Match the exact same value',
      },
      {
        name: 'Every',
        value: 'every',
        description: 'Triggers on every discord message',
      },
      {
        name: 'Regex',
        value: 'regex',
        description: 'Match the custom ECMAScript regex provided',
      },
      {
        name: 'Starts With',
        value: 'start',
        description: 'Match the message beginning with the specified value',
      },
    ],
    default: 'start',
    description: 'Select how the value below will be recognized. ⚠ Keep in mind that the value will be tested with all mentions removed and a trim applied (whitespaces removed at the beginning and at the end). For example "@bot hello" will be tested on "hello"',
  },
  {
    displayName: 'Value',
    name: 'value',
    type: 'string',
    placeholder: 'e.g. !hello',
    displayOptions: {
      show: {
        type: ['message', 'direct-message'],
        pattern: ['equal', 'start', 'contain', 'end', 'regex'],
      },
    },
    required: true,
    default: '',
    description: 'The value you will test on all messages listened to',
  },
  {
    displayName: 'Case Sensitive',
    name: 'caseSensitive',
    type: 'boolean',
    displayOptions: {
      show: {
        type: ['message', 'direct-message'],
      },
    },

    default: false,
    description: 'Whether the value will be sensible to the case when matching the value',
  },
  {
    displayName: 'Trigger Only on Message Replies',
    name: 'messageReferenceRequired',
    type: 'boolean',
    displayOptions: {
      show: {
        type: ['message', 'direct-message'],
      },
    },

    default: false,
    description: 'Whether the trigger activates only when the user replies to a message. The replied-to message will be included.',
  },
  {
    displayName: 'Message ID',
    name: 'interactionMessageId',
    type: 'string',
    displayOptions: {
      show: {
        type: ['interaction'],
      },
    },
    required: true,
    default: '',
    description: 'The message ID of the button/select to listen to',
  },
  {
    displayName: 'Additional Fields',
    name: 'additionalFields',
    type: 'collection',
    default: {},
    placeholder: 'Add Field',
    options: [
      {
        displayName: 'Trigger on Other Bot Input',
        name: 'externalBotTrigger',
        type: 'boolean',
        default: false,
        description: "Whether this node triggers when another bot sends a message",
      },
      {
        displayName: 'Attachment(s) Required',
        name: 'attachmentsRequired',
        type: 'boolean',
        default: false,
        description: "Whether this node needs to have at least one attachment to be triggered",
      },
    ],
  }
];
