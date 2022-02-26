#!/usr/bin/env node
'use strict';

const playerdatadir = './playerdata';
const output = './output';
const blacklist = [
    "minecraft:shulker_box",
    "minecraft:white_shulker_box",
    "minecraft:orange_shulker_box",
    "minecraft:magenta_shulker_box",
    "minecraft:light_blue_shulker_box",
    "minecraft:yellow_shulker_box",
    "minecraft:lime_shulker_box",
    "minecraft:pink_shulker_box",
    "minecraft:gray_shulker_box",
    "minecraft:light_gray_shulker_box",
    "minecraft:cyan_shulker_box",
    "minecraft:purple_shulker_box",
    "minecraft:blue_shulker_box",
    "minecraft:brown_shulker_box",
    "minecraft:green_shulker_box",
    "minecraft:red_shulker_box",
    "minecraft:black_shulker_box",
    "minecraft:chest",
    "minecraft:trapped_chest",
    "minecraft:barrel",
    "minecraft:axolotl_spawn_egg",
    "minecraft:bat_spawn_egg",
    "minecraft:bee_spawn_egg",
    "minecraft:blaze_spawn_egg",
    "minecraft:cave_spider_spawn_egg",
    "minecraft:cat_spawn_egg",
    "minecraft:chicken_spawn_egg",
    "minecraft:cod_spawn_egg",
    "minecraft:cow_spawn_egg",
    "minecraft:creeper_spawn_egg",
    "minecraft:dolphin_spawn_egg",
    "minecraft:dolphin_spawn_egg",
    "minecraft:dolphin_spawn_egg",
    "minecraft:dolphin_spawn_egg",
    "minecraft:enderman_spawn_egg",
    "minecraft:endermite_spawn_egg",
    "minecraft:endermite_spawn_egg",
    "minecraft:fox_spawn_egg",
    "minecraft:ghast_spawn_egg",
    "minecraft:glow_squid_spawn_egg",
    "minecraft:guardian_spawn_egg",
    "minecraft:hoglin_spawn_egg",
    "minecraft:horse_spawn_egg",
    "minecraft:husk_spawn_egg",
    "minecraft:llama_spawn_egg",
    "minecraft:magma_cube_spawn_egg",
    "minecraft:mooshroom_spawn_egg",
    "minecraft:mule_spawn_egg",
    "minecraft:ocelot_spawn_egg",
    "minecraft:panda_spawn_egg",
    "minecraft:parrot_spawn_egg",
    "minecraft:phantom_spawn_egg",
    "minecraft:pig_spawn_egg",
    "minecraft:piglin_spawn_egg",
    "minecraft:piglin_brute_spawn_egg",
    "minecraft:pillager_spawn_egg",
    "minecraft:polar_bear_spawn_egg",
    "minecraft:pufferfish_spawn_egg",
    "minecraft:rabbit_spawn_egg",
    "minecraft:ravager_spawn_egg",
    "minecraft:salmon_spawn_egg",
    "minecraft:sheep_spawn_egg",
    "minecraft:shulker_spawn_egg",
    "minecraft:silverfish_spawn_egg",
    "minecraft:skeleton_spawn_egg",
    "minecraft:skeleton_horse_spawn_egg",
    "minecraft:slime_spawn_egg",
    "minecraft:spider_spawn_egg",
    "minecraft:squid_spawn_egg",
    "minecraft:stray_spawn_egg",
    "minecraft:strider_spawn_egg",
    "minecraft:trader_llama_spawn_egg",
    "minecraft:tropical_fish_spawn_egg",
    "minecraft:turtle_spawn_egg",
    "minecraft:vex_spawn_egg",
    "minecraft:villager_spawn_egg",
    "minecraft:vindicator_spawn_egg",
    "minecraft:wandering_trader_spawn_egg",
    "minecraft:witch_spawn_egg",
    "minecraft:wither_skeleton_spawn_egg",
    "minecraft:wolf_spawn_egg",
    "minecraft:zombie_spawn_egg",
    "minecraft:zombie_horse_spawn_egg",
    "minecraft:zombie_villager_spawn_egg",
    "minecraft:zombified_piglin_spawn_egg",
    "minecraft:spawner"
];

const whitelist = [
    "minecraft:written_book"
];

const tagToRemove = [
    "Enchantments",
    "AttributeModifiers",
    "HideFlags",
    "Unbreakable",
    "StoredEnchantments"
];

const attributesToRemove = [
    "XpTotal",
    "XpLevel",
    "XpP"
];

const fs = require('fs/promises');
const path = require('path');
const gzip = require('node-gzip');
const nbt = require('prismarine-nbt');

let players = [];
let counter = 0;

(async () => {
    const files = await fs.readdir(playerdatadir);

    await Promise.all(
        files.map(async (file) => {
            if (file.split('.')[1] === 'dat' && file.length === 40) {
                const playerfile = path.resolve(playerdatadir, file);
                players.push(file);
            }
        })
    );

    for (let player of players) {
        const buffer = await fs.readFile(path.resolve(playerdatadir, player));
        const { parsed } = await nbt.parse(buffer);
        if (parsed.value) {
            const newNBT = await flatten(parsed);
            console.log('Update', path.resolve(output, player));
            counter += 1;
            fs.writeFile(path.resolve(output, player), await gzip.gzip(await nbt.writeUncompressed(newNBT)));
        }
    }
    console.log('Update complete with', counter, 'files written.')
})();

async function flatten(data) {
    // attributes
    attributesToRemove.forEach(function(attr) {
        if (nestedValue(data, 'value', attr)) {
            delete data.value[attr];
        }
    });
    // inventory
    if (data.value.Inventory) {
        let inv = await shrink(data.value.Inventory.value.value);
        data.value.Inventory.value.value = inv;
    }
    // ender items
    if (data.value.EnderItems) {
        let ender = await shrink(data.value.EnderItems.value.value);
        data.value.EnderItems.value.value = ender;
    }
    return data;
}

async function shrink(items) {
    let filtered = []
    await Promise.all(items.map(async (item) => {

        if (whitelist.indexOf(item.id.value) !== -1) {
            // handle whitelist
            item.Count.value = 1;
            tagToRemove.forEach(function(tag) {
                item = removeTag(item, tag);
            });
            filtered.push(item);
        } else {
            // filter blacklist
            if (blacklist.indexOf(item.id.value) === -1) {
                // remove stack
                item.Count.value = 1;
                if (nestedValue(item, 'tag', 'value', 'display', 'value', 'Lore')) {
                    tagToRemove.forEach(function(tag) {
                        item = removeTag(item, tag);
                    });
                    filtered.push(item);
                }
            }
        }
        
    }));
    return filtered;
}

function removeTag(item, tag) {
    if (nestedValue(item, 'tag', 'value', tag, 'type')) {
        delete item.tag.value[tag];
    }
    return item;
}

// test & get value from nested object
function nestedValue(obj, ...args) {
    return args.reduce((obj, level) => obj && obj[level], obj);
}
