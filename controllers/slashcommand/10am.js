var slashcommand = require('./index');
var hemera = require('../hemera');
var whitelist = require('../utils/10amwhitelist');
var controller;

/**
 * Responds to the 10AM slash command
 * @param  {Object} bot
 * @param  {Object} message
 */
module.exports = function (bot, message) {
    console.log('[HEMERA] Got a 10AM update');
    console.log(message);
    controller = slashcommand.getController();
    botHemera = hemera.getBot();

    // Get the user object that is making the request
    controller.storage.users.get(message.user, function(err, user) {
        if (err) {
            bot.res.send('Ooops, there was an error. How embarassing. ' + err.toString());
            console.trace(err);
            return;
        }

        if (!user || !user.slackUser) {
            botHemera.replyPrivate('I don\'t know you yet. Why don\'t you say "@hemera hi" and introduce yourself.');
            return;
        }

        // Record the last time the user made an update and what that update was
        user.lastUpdate_at = new Date();
        user.lastUpdate = message.text;
        controller.storage.users.save(user, function(err) {
            if (err) {
                console.trace(err);
                bot.res.send('Ooops, there was an error. How embarassing. ' + err.toString());
                return;
            }

            // Send their update to our main 10AM channel
            var publicUpdate = '*' + user.slackUser.name + '\'s* plan for the day is: \n'
                + '>>> ' + message.text;
            botHemera.api.chat.postMessage({
                channel: process.env.NODE_ENV === 'production' ? '10am' : '10amtest',
                text: publicUpdate,
                as_user: true
            }, function(err) {
                if (err) {
                    console.trace(err);
                    bot.res.send('Ooops, there was an error. How embarassing. ' + err.toString());
                    return;
                }

                // Respond to the API at this point so the rest is done after the request
                bot.res.send('OK, I will post your update!');
                console.log('[HEMERA] posted 10am update to public slack channel');

                // Now send a PM to each of our users with that update
                controller.storage.users.all(function(err, users) {
                    if (err) {
                        console.trace(err);
                        return;
                    }

                    if (users && users.length) {
                        for (var i = 0; i < users.length; i++) {
                            var recipient = users[i];

                            if (recipient.slackUser && recipient.slackUser.is_bot) {
                                console.log('[HEMERA] Not posting a message to another bot: %s', recipient.slackUser.name);
                                continue;
                            }

                            // Only process our whitelist
                            if (whitelist.indexOf(recipient.slackUser.name) === -1) {
                                console.log('[HEMERA] Not posting a message to a user not in the beta: %s', recipient.slackUser.name);
                                continue;
                            }

                            // Don't send a message to the user that's posting the update
                            if (recipient.id === user.id) {
                                console.log('[HEMERA] Not posting a message to myself: %s', user.slackUser.name);
                                continue;
                            }

                            // Don't send a message to this person if they snoozed the user posting the update
                            if (recipient.snooze && recipient.snooze.length && recipient.snooze.indexOf(user.slackUser.name) > -1) {
                                console.log('[HEMERA] Not posting a message to %s because they are being snoozed by %s', user.slackUser.name, recipient.slackUser.name);
                                continue;
                            }

                            // Open an IM channel and post to it
                            console.log('[HEMERA] Posting a private message to: %s', recipient.slackUser.name);
                            botHemera.api.im.open({
                                user: process.env.NODE_ENV === 'production' ? recipient.id : 'U03TC9WA9',
                            }, function (err, res) {
                                if (err) {
                                    console.trace(err);
                                    return;
                                }
                                console.log(res);

                                var channelId = res.ok ? res.channel.id : null;
                                if (channelId) {
                                    botHemera.api.chat.postMessage({
                                        channel: channelId,
                                        text: publicUpdate,
                                        as_user: true
                                    }, function(err, res) {
                                        if (err) {
                                            return console.trace(err);
                                        }
                                        console.log(res);
                                    });
                                }
                            });
                        }
                    }
                });
            });
        });
    });
};
