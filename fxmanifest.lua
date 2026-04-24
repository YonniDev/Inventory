fx_version 'cerulean'
game 'gta5'

author "Pappu"
description 'qb-inventorynp - Redesigned UI'
version '2.0.0'

shared_scripts {
	'config.lua',
	'@qb-weapons/config.lua'
}

lua54 'yes'

server_scripts {
	'@oxmysql/lib/MySQL.lua',
	'server/main.lua',
}

client_scripts {
	'client/main.lua',
}

ui_page {
	'nui/index.html'
}

files {
	'nui/index.html',
	'nui/css/inventory.css',
	'nui/js/inventory.js',
	'nui/images/*.svg',
	'nui/images/*.png',
	'nui/images/*.jpg',
	'nui/inventory_images/*.png',
	'nui/ammo_images/*.png',
	'nui/attachment_images/*.png',
	'nui/*.ttf'
}
