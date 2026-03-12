'use strict';

const { Service } = require('egg');

class ChannelService extends Service {

  /**
   * List all channels
   * @returns {object[]} list of channels
   */
  async list() {
    const { ctx } = this;

    const channels = await ctx.model.Channel.findAll({
      order: [['createdAt', 'ASC']],
    });

    return channels;
  }

  /**
   * Get a single channel by ID
   * @param {number} channelId
   * @returns {object} channel data
   */
  async show(channelId) {
    const { ctx } = this;

    const channel = await ctx.model.Channel.findByPk(channelId);
    if (!channel) {
      ctx.throw(404, 'Channel not found');
    }

    return channel;
  }
}

module.exports = ChannelService;
