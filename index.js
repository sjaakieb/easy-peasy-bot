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

controller.hears(['hello'], ['ambient', 'direct_message', 'direct_mention'], function (bot, message) {
    bot.reply(message, 'Hello!');

    bot.say({ text: 'Screw You !', channel: message.user }, function (response, error) {
        console.log("Response", response);
        console.error(error);
    });

});


var shops = [
    { name: "Subway", url: "https://www.thuisbezorgd.nl/en/subway-rotterdam-oude-binnenweg", menu: ["Chicken Teriyaki € 7,30", "Italian B.M.T® € 7,10", "Chicken Teriyaki € 7,00", "Veggie Patty € 9,80", "Subway Melt™ € 9,80", "Steak & Cheese € 9,80", "Chicken Fajita € 9,80", "Chicken Teriyaki € 9,80", "Gegrilde Kipfilet € 9,60", "American Steakhouse Melt € 9,60", "Italian B.M.T® € 9,60", "Spicy Italian € 9,60", "Tonijn € 9,60", "Ham € 8,80", "Kalkoenfilet € 8,80", "BLT € 8,80", "Veggie Delite™ € 8,80", "Ei & Kaas € 9,29", "Bacon, Ei & kaas € 10,09", "Ham, Ei & Kaas € 10,09", "Steak, Ei & Kaas € 11,29", "Veggie Patty € 7,00", "Subway Melt™ € 7,00", "Steak & Cheese € 7,00", "Chicken Fajita € 7,00", "Chicken Teriyaki € 7,00", "Gegrilde Kipfilet € 6,80", "American Steakhouse Melt € 6,80", "Italian B.M.T® € 6,80", "Spicy Italian € 6,80", "Tonijn € 6,80", "Ham € 6,00", "Kalkoenfilet € 6,00", "BLT € 6,00", "Veggie Delite™ € 6,00", "Ei & Kaas € 6,49", "Bacon, Ei & kaas € 7,29", "Ham, Ei & Kaas € 7,29", "Steak, Ei & Kaas € 8,49", "Veggie Patty € 7,30", "Subway Melt™ € 7,30", "Steak & Cheese € 7,30", "Chicken Fajita € 7,30", "Chicken Teriyaki € 7,30", "Gegrilde Kipfilet € 7,10", "American Steakhouse Melt € 7,10", "Italian B.M.T® € 7,10", "Spicy Italian € 7,10", "Tonijn € 7,10", "Ham € 6,30", "Kalkoenfilet € 6,30", "BLT € 6,30", "Veggie Delite™ € 6,30", "Ei & Kaas € 6,79", "Bacon, Ei & kaas € 7,59", "Ham, Ei & Kaas € 7,59", "Steak, Ei & Kaas € 8,79", "Veggie Patty € 4,50", "Subway Melt™ € 4,50", "Steak & Cheese € 4,50", "Chicken Fajita € 4,50", "Chicken Teriyaki € 4,50", "Gegrilde Kipfilet € 4,30", "American Steakhouse Melt € 4,30", "Italian B.M.T® € 4,30", "Spicy Italian € 4,30", "Tonijn € 4,30", "Ham € 3,50", "Kalkoenfilet € 3,50", "BLT € 3,50", "Veggie Delite™ € 3,50", "Ei & Kaas € 3,99", "Bacon, Ei & kaas € 4,79", "Ham, Ei & Kaas € 4,79", "Steak, Ei & Kaas € 5,99", "Chicken Teriyaki Salad € 7,50", "Veggie Patty Salad € 7,50", "Subway Melt™ Salad € 7,50", "Steak & Cheese Salad € 7,50", "Chicken Fajita Salad € 7,50", "Gegrilde Kipfilet Salad € 7,50", "American Steakhouse Melt Salad € 7,50", "Italian B.M.T® Salad € 7,50", "Spicy Italian Salad € 7,50", "Tonijn Salad € 7,50", "Ham Salad € 7,50", "Kalkoenfilet Salad € 7,50", "BLT Salad € 7,50", "Veggie Delite™ Salad € 7,50", "Chicken Teriyaki Salad € 5,00", "Veggie Patty Salad € 5,00", "Subway Melt™ Salad € 5,00", "Steak & Cheese Salad € 5,00", "Chicken Fajita Salad € 5,00", "Gegrilde Kipfilet Salad € 5,00", "American Steakhouse Melt Salad € 5,00", "Italian B.M.T® Salad € 5,00", "Spicy Italian Salad € 5,00", "Tonijn Salad € 5,00", "Ham Salad € 5,00"] },
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

*HELP*
> Returns the list of all available commands.

*I NEED FOOD | LUNCH*
> Returns the list of all the users that are going out today to any place AND the list of all the users that are ordering today from any place.


*OPEN SHOPS*
> Returns a list of nearby shops (plus the ShopSites URLs) that are currently open and can deliver to the office

*MENU FROM (SHOP)*
> Returns the Shop menu or the ShopSite URL.

*ORDER FROM (SHOP) AT (TIME): (ITEM1), (ITEM2)*
> Stores that current user is ordering from a certain place at a certain time.
> Time states the moment the user will be actually ordering, and not the estimated time of delivery.
> _The items must be enumerated with comas (,) and must be at least one._
> The user will also receive a *reminder* (via Slack) N minutes before the ordering, with the complete list of items to order from all the users that added products to the order (if any).

*ORDER FROM (SHOP): (ITEM1), (ITEM2)*
> Stores that current user is adding some items to an existing order list to a certain shop (at a certain time).
> _The items must be enumerated with comas (,) and must be at least one._

*WHO IS ORDERING?*
> Returns the list of all the users that are ordering today from any place.


*GOING OUT TO (SHOP) AT (TIME)*
> Stores that current user is going to a certain place at a certain time.
> Time states the moment the user will be actually leaving the office.
> All the users going together will also receive a *reminder* (via Slack) N minutes before the leaving, with the complete list of users that joined him and/or items to order from all the users that asked for products (if any).

*WHO IS GOING OUT?*
> Returns the list of all the users that are going out today to any place.

*JOIN (USER)*
> Stores that current user is going along with certain user to a certain place at a certain time.

*ASK (USER) FOR (TEXT)*
> Stores text (it can be items or any other thing) that current user is asking the other users going out ot a certain place at a certain time to get for him.`;

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

controller.hears(['order from (.*) at ([0-9]{1,2}:[0-9]{2})'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var time = message.match[2].split(":");
    var hour = parseInt(time[0]);
    var minutes = parseInt(time[1]);
    var shop = shops.find(function (a) { return a.name.toLowerCase() === shopName.toLowerCase() });
    if (shop) {
        var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
        request.post({ url: "https://slack.com/api/users.info", form: { token: token, user: message.user } }, function (error, response, body) {
            var data = JSON.parse(body);
            orders.push({
                user: data.user,
                shop: shopName,
                time: time,
                items: {}
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
            bot.reply(message, `<@${data.user.name}> will order at ${shopName} at ${message.match[2]}`);
        });
    } else {
        bot.reply(message, "Shop not found");
    }
});


controller.hears(['order from (.*): ([^,]+(,{\s}*[^,]+)*)'], ['direct_message'], function (bot, message) {
    var shopName = message.match[1];
    var items = message.match[2].split(",");
    var order = orders.find(function (order) {
        return order.shop.toLowerCase() == shopName.toLowerCase();
    });
    if (order) {
        var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
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

controller.hears(['help'], ['direct_message'], function (bot, message) {
    bot.reply(message, helpText);
});
/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});
