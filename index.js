var request = require('request');
var cheerio = require('cheerio');
var schedule = require('node-schedule');
var moment = require('moment');

/**
 * A Bot for Slack!
 */


/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({ user: installer }, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({ mongoUri: process.env.MONGOLAB_URI }),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN) ? './db_slack_bot_ci/' : './db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

var shopsGoingOut = [];
var shoppingList = [];

var shops = [
    { name: "Subway", url: "https://www.thuisbezorgd.nl/en/subway-rotterdam-oude-binnenweg", menu: ["Chicken Teriyaki € 7,30", "Italian B.M.T® € 7,10", "Chicken Teriyaki € 7,00", "Veggie Patty € 9,80", "Subway Melt™ € 9,80", "Steak & Cheese € 9,80", "Chicken Fajita € 9,80", "Chicken Teriyaki € 9,80", "Gegrilde Kipfilet € 9,60"] },
    { name: "Pannenkoekenhuis Dutch Diner", url: "https://www.thuisbezorgd.nl/en/dutch-diner", menu: [] },
    { name: "Bakker Bart", menu: [] },
    { name: "Vis en Kipgilde" },
    { name: "Croissanterie de Snor" },
    { name: "Kumpir Corner" },
    { name: "EG Budapest" },
    { name: "El Aviv Overschie" },
    { name: "El Aviv Lorentzlaan" },
    { name: "El Aviv Schiedam" }];

var orders = [];

var helpText = `
*Lunch-o-Bot-o Command-o-s*
*I NEED FOOD | LUNCH*
> Shows who is going where and when, and who is ordering from where and when
*OPEN SHOPS*
> Shows which shops are nearby and open, and can deliver to the office
*MENU FROM (shop)*
> Shows the shop's menu
*ORDER FROM (shop) AT (time): (item1), (item2)*
> Creates an order
*ORDER FROM (shop): (item1), (item2)*
> Adds items to an existing order
*WHO IS ORDERING?*
> Shows who is ordering from where and when
*GOING OUT TO (shop) AT (time)*
> Creates a _lunch quest_
*WHO IS GOING OUT?*
> Shows all existing _lunch quests_ (who is going where and when)
*JOIN (user)*
> Adds you to an existing _lunch quest_
*ASK (user) FOR (text)*
> Allows you to parasite an existing _lunch quest_ without leaving your seat
*HELP (command-o)*
> Shows full description on a desired command
`;

var helpDetails = {
    "i": `
*I NEED FOOD | LUNCH*
> Returns the list of all the users that are going out today to any place AND the list of all the users that are ordering today from any place.
    `,
    "open": `
*OPEN SHOPS*
> Returns a list of nearby shops (plus the ShopSites URLs) that are currently open and can deliver to the office
    `,
    "menu": `
*MENU FROM (SHOP)*
> Returns the Shop menu or the ShopSite URL.
    `,
    "order": `
*ORDER FROM (SHOP) AT (TIME): (ITEM1), (ITEM2)*
> Stores that current user is ordering from a certain place at a certain time.
> Time states the moment the user will be actually ordering, and not the estimated time of delivery.
> _The items must be enumerated with comas (,) and must be at least one._
> The user will also receive a *reminder* (via Slack) N minutes before the ordering, with the complete list of items to order from all the users that added products to the order (if any).

*ORDER FROM (SHOP): (ITEM1), (ITEM2)*
> Stores that current user is adding some items to an existing order list to a certain shop (at a certain time).
> _The items must be enumerated with comas (,) and must be at least one._
`,
    "who": `
*WHO IS ORDERING?*
> Returns the list of all the users that are ordering today from any place.
*WHO IS GOING OUT?*
> Returns the list of all the users that are going out today to any place.
    `,
    "going": `
*GOING OUT TO (SHOP) AT (TIME)*
> Stores that current user is going to a certain place at a certain time.
> Time states the moment the user will be actually leaving the office.
> All the users going together will also receive a *reminder* (via Slack) N minutes before the leaving, with the complete list of users that joined him and/or items to order from all the users that asked for products (if any).
    `,
    "join": `
*JOIN (USER)*
> Stores that current user is going along with certain user to a certain place at a certain time.
    `,
    "ask": `
*ASK (USER) FOR (TEXT)*
> Stores text (it can be items or any other thing) that current user is asking the other users going out ot a certain place at a certain time to get for him.    
    `
}
controller.hears('open shops', ['direct_message'], function (bot, message) {
    // request('https://www.thuisbezorgd.nl/en/order-takeaway-rotterdam-centrum-3011', function (error, response, body) {
    //   var $ = cheerio.load(body);
    //   console.log(body);
    //   var restaurantElements = $("h2.restaurantname a.restaurantname");
    //   var restaurantNames = []
    //   console.log("FOUND restaurants",restaurantElements.length);
    //   restaurantElements.map(function(index, element){
    //       console.log("Jippie!");
    //       console.log(index,element);
    //       restaurantNames.push($(element).text())
    //   });
    //   bot.reply(message, restaurantNames.join("\n"));
    // });
    var restaurantNames = shops.map(function (shop) { return shop.name });
    bot.reply(message, restaurantNames.join("\n"));
});

controller.hears(['menu from (.*)'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var shop = shops.find(function (a) { return a.name.toLowerCase() === shopName.toLowerCase() });
    if (shop) {
        bot.reply(message, shop.menu.join("\n"));
    } else {
        bot.reply(message, "Shop not found");
    }
});

controller.hears(['webpage (.*)'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var shop = shops.find(function (a) { return a.name.toLowerCase() === shopName.toLowerCase() });
    if (shop) {
        bot.reply(message, shop.url);
    } else {
        bot.reply(message, "Shop not found");
    }
});

function startOrder(bot, message, shopName, time, items) {
    var time = message.match[2];
    var hour = parseInt(time.split(":")[0]);
    var minutes = parseInt(time.split(":")[1]);
    var shop = shops.find(function (a) { return a.name.toLowerCase() === shopName.toLowerCase() });
    if (shop) {
        request.post({ url: "https://slack.com/api/users.info", form: { token: token, user: message.user } }, function (error, response, body) {
            var data = JSON.parse(body);

            var itemObject = {};

            items.forEach(function (item) {
                itemObject[item] = [data.user.name];
            })

            orders.push({
                user: data.user,
                shop: shopName,
                time: time,
                items: itemObject
            })

            var reminder = moment().hour(hour).minutes(minutes).seconds(0);
            // var reminder = moment().add(10,"seconds");
            var j = schedule.scheduleJob(reminder.toDate(), function () {
                var order = orders.find(function (a) { return a.shop.toLowerCase() === shopName.toLowerCase() });

                var itemText = Object.keys(order.items).map(function (item) {
                    var users = order.items[item].join(",");
                    return `${item} by ${users}`
                });
                if (order) {
                    bot.say({ text: `Final order for ${shopName} \n ${itemText.join("\n")}`, channel: message.channel });
                }
            });
            var itemText = items.join(",");
            bot.reply(message, `<@${data.user.name}> will order ${itemText} from ${shopName} at ${message.match[2]}`);
        });
    } else {
        bot.reply(message, "Shop not found");
    }
}

controller.hears(['order from (.*) at ([0-9]{1,2}:[0-9]{2}): (.*)'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var time = message.match[2];
    var items = message.match[3].split(",").map(function (item) { return item.trim() });
    startOrder(bot, message, shopName, time, items);
});

controller.hears(['order from (.*) at ([0-9]{1,2}:[0-9]{2})'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var time = message.match[2];
    startOrder(bot, message, shopName, time, []);
});

// controller.hears(['order from (.*): ([^,]+[,\s*[^,]+]*)'], ['direct_message'], function (bot, message) {
controller.hears(['order from (.*): (.*)'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var items = message.match[2].split(",").map(function (item) { return item.trim() });
    var order = orders.find(function (order) {
        return order.shop.toLowerCase() == shopName.toLowerCase();
    });
    if (order) {
        request.post({ url: "https://slack.com/api/users.info", form: { token: token, user: message.user } }, function (error, response, body) {
            var data = JSON.parse(body);
            items.forEach(function (item) {
                if (!order.items[item]) {
                    order.items[item] = [data.user.name];
                } else {
                    order.items[item].push(data.user.name);
                }
            })
            bot.reply(message, `ordered items ${items} from ${shopName}`);
        });
    } else {
        bot.reply(message, "No shop found with that order");
    }
});

controller.hears(['who is ordering'], ['direct_message'], function (bot, message) {
    var ordersText = orders.map(function (order) { return `<@${order.user.name}> is ordering from ${order.shop} at ${order.time}` });
    bot.reply(message, ordersText.join("\n"));
});


controller.hears(['what is being ordered from (.*)'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var order = orders.find(function (order) {
        return order.shop.toLowerCase() == shopName.toLowerCase();
    });
    if (order) {
        var itemText = Object.keys(order.items).map(function (item) {
            var users = order.items[item].join(",");
            return `${item} by ${users}`
        });
        bot.reply(message, `${itemText.join("\n")}`);
    } else {
        bot.reply(message, "Nothing");
    }
});

controller.hears(['help (.*)'], ['direct_message'], function (bot, message) {
    console.log("help details ", message.match[1]);
    var keyword = message.match[1].split(" ")[0].toLowerCase();
    if (helpDetails[keyword]) {
        bot.reply(message, helpDetails[keyword]);
    } else {
        bot.reply(message, "unknown command");
    }

});

controller.hears(['help'], ['direct_message'], function (bot, message) {
    bot.reply(message, helpText);
});


controller.hears(['going out to (.*) at ([0-9]{1,2}:[0-9]{2})'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var time = message.match[2];
    var hour = parseInt(time.split(":")[0]);
    var minutes = parseInt(time.split(":")[1]);

    if (shopName) {
        request.post({ url: "https://slack.com/api/users.info", form: { token: token, user: message.user } }, function (error, response, body) {
            var data = JSON.parse(body);

            var shopKey = shopName + ' at ' + time;

            if (!shopsGoingOut[shopKey]) {
                shopsGoingOut[shopKey] = [];
            }

            shopsGoingOut[shopKey].push(data.user.name);

            var reminder = moment().hour(hour).minutes(minutes).seconds(0);

            var j = schedule.scheduleJob(reminder.toDate(), function () {


                var whoIsGoingOut = shopsGoingOut[shopKey].map(function (userName) {
                    return `<@${userName}>`;
                }).join(", ");

                bot.say({ text: `Time to go to ${shopName} with ${whoIsGoingOut}`, channel: message.channel });

                var shoppingText = shoppingList[shopKey].map(function (request) {
                    return `${request.items} for <@${request.user.name}>`;
                }).join("\n");

                if (shoppingText){
                    bot.say({ text: `Don't forget to bring :\n  ${shoppingText}`, channel: message.channel });
                }

            });

            bot.reply(message, `OK <@${data.user.name}>, you are going out to ${shopName} at ${time}`);
        });
    }
});

controller.hears(['who is going out'], ['direct_message'], function (bot, message) {

    var whoIsGoingOut = ``;

    for (var shopKey in shopsGoingOut) {

        whoIsGoingOut += `${shopKey} -> `;

        shopsGoingOut[shopKey].forEach(function (userName) {
            whoIsGoingOut += `<@${userName}> `;
        });

        whoIsGoingOut += `\n`;

    }

    bot.reply(message, whoIsGoingOut);
});

controller.hears(['join (.*)'], ['direct_message'], function (bot, message) {

    var joinUserId = message.match[1].substr(2).slice(0, -1);

    request.post({ url: "https://slack.com/api/users.info", form: { token: token, user: joinUserId } }, function (error, response, body) {
        var dataJoin = JSON.parse(body);

        request.post({ url: "https://slack.com/api/users.info", form: { token: token, user: message.user } }, function (error, response, body) {
            var dataUser = JSON.parse(body);

            var userName = dataUser.user.name;
            var joinUserName = dataJoin.user.name;

            for (var shopKey in shopsGoingOut) {

                if (shopsGoingOut[shopKey].includes(joinUserName)) {

                    var members = shopsGoingOut[shopKey].map(function (member) {
                        return `<@${member}>`;
                    });

                    shopsGoingOut[shopKey].push(userName);

                    bot.reply(message, `Ok, you joined ${members} on ${shopKey}`);

                    break;

                }
            }

        });

    });

});

controller.hears(['ask (.*) for (.*)'], ['direct_message'], function (bot, message) {

    var askUserId = message.match[1].substr(2).slice(0, -1);
    var text = message.match[2];


    request.post({ url: "https://slack.com/api/users.info", form: { token: token, user: askUserId } }, function (error, response, body) {
        var dataAsk = JSON.parse(body);

        request.post({ url: "https://slack.com/api/users.info", form: { token: token, user: message.user } }, function (error, response, body) {
            var dataUser = JSON.parse(body);

            var userName = dataUser.user.name;
            var askUserName = dataAsk.user.name;

            for (var shopKey in shopsGoingOut) {

                if (shopsGoingOut[shopKey].includes(askUserName)) {
                    if (!shoppingList[shopKey]){
                        shoppingList[shopKey]=[];
                    }
                    shoppingList[shopKey].push({user:dataUser.user,items:text});

                    bot.reply(message, `Ok, I'll remind <@${askUserId}> to bring ${text} for you from ${shopKey}`);

                    break;

                }
            }

        });

    });



});

/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
controller.on('direct_message,mention,direct_mention', function (bot, message) {
    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function (err) {
        if (err) {
            console.log(err);
        }
        bot.reply(message, 'Command not supported. Please type "help"');
    });
});