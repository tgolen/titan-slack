var Botkit = require('botkit');
var controller = Botkit.slackbot({
    debug: process.env.NODE_ENV !== 'production',
    storage: require('botkit-storage-mongo')({mongoUri: process.env.DATABASE_URL})
});
var bot;

/**
 * Start the bot
 *
 * @returns {Object} the created slackbot
 */
exports.start = function start() {
    bot = controller.spawn({
        token: process.env.SLACKBOT_TOKEN
    }).startRTM();

    controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', require('./listeners/hi'));
    controller.hears(['reset'], 'direct_message,direct_mention,mention', require('./listeners/reset'));
    controller.hears(['list'], 'direct_message,direct_mention,mention', require('./listeners/list'));
    controller.hears(['add (.*)'], 'direct_message,direct_mention,mention', require('./listeners/add'));
    controller.hears(['help'], 'direct_message,direct_mention,mention', require('./listeners/help'));

    return bot;
};

/**
 * Get the botkit controller
 * @return {Object}
 */
exports.getController = function getController() {
    return controller;
}

/**
 * Get the running bot
 * @return {Object}
 */
exports.getBot = function getController() {
    return bot;
}
