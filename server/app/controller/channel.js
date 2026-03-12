'use strict';

const { Controller } = require('egg');

class ChannelController extends Controller {
  /**
   * GET /api/v1/channels
   * List all channels.
   * Public endpoint.
   */
  async list() {
    const { ctx } = this;

    const result = await ctx.service.channel.list();

    ctx.body = { code: 0, msg: 'ok', data: result };
  }

  /**
   * GET /api/v1/channels/:channelId
   * Get a single channel by ID.
   * Public endpoint.
   */
  async show() {
    const { ctx } = this;
    const { channelId } = ctx.params;

    const result = await ctx.service.channel.show(channelId);

    ctx.body = { code: 0, msg: 'ok', data: result };
  }
}

module.exports = ChannelController;
