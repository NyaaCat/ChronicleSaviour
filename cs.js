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
    "minecraft:chest"
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
    // xp
    if (data.value.XpTotal) data.value.XpTotal.value = 0;
    if (data.value.XpLevel) data.value.XpLevel.value = 0;
    if (data.value.XpP) data.value.XpP.value = 0.0;
    // spawn
    if (data.value.SpawnX) delete data.value.SpawnX;
    if (data.value.SpawnY) delete data.value.SpawnY;
    if (data.value.SpawnZ) delete data.value.SpawnZ;
    if (data.value.SpawnDimension) delete data.value.SpawnDimension;
    if (data.value.Pos) delete data.value.Pos;
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
    Promise.all(items.map(async (item) => {
        // filter blacklist
        if (blacklist.indexOf(item.id.value) === -1) {
            // remove stack
            item.Count.value = 1;
            if (nestedValue(item, 'tag', 'value', 'display', 'value', 'Lore')) {
                if (item.tag.value.Enchantments) {
                    delete item.tag.value.Enchantments;
                }
                if (item.tag.value.AttributeModifiers) {
                    delete item.tag.value.AttributeModifiers
                }
                if (item.tag.value.HideFlags) {
                    delete item.tag.value.HideFlags
                }
                if (item.tag.value.RepairCost) {
                    delete item.tag.value.RepairCost;
                }
                if (item.tag.value.Damage) {
                    delete item.tag.value.Damage;
                }
                if (item.tag.value.Unbreakable) {
                    delete item.tag.value.Unbreakable;
                }
                if (item.tag.value.HideFlags) {
                    delete item.tag.value.HideFlags;
                }
                if (item.tag.value.StoredEnchantments) {
                    delete item.tag.value.StoredEnchantments;
                }
                filtered.push(item);
            }
        }
    }));
    return filtered;
}

// test & get value from nested object
function nestedValue(obj, ...args) {
  return args.reduce((obj, level) => obj && obj[level], obj)
}
