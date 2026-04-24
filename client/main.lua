--[[
    QBCore Inventory - Client Script
    Handles inventory UI, player stats, and NUI communication
]]--

local QBCore = exports['qb-core']:GetCoreObject()
local PlayerData = {}
local inInventory = false
local currentOther = nil

-- Get player stats from QBCore
local function GetPlayerStats()
    local player = PlayerPedId()
    local health = GetEntityHealth(player)
    local armor = GetPedArmour(player)
    
    -- Convert health (100-200 range in GTA to 0-100)
    local healthPercent = math.max(0, math.min(100, (health - 100)))
    local armorPercent = math.max(0, math.min(100, armor))
    
    -- Get QBCore metadata for hunger, thirst, stress
    local playerState = PlayerData.metadata or {}
    local hunger = playerState.hunger or 100
    local thirst = playerState.thirst or 100
    local stress = playerState.stress or 0
    
    -- Get cash
    local cash = 0
    if PlayerData.money then
        cash = PlayerData.money.cash or 0
    end
    
    return {
        health = healthPercent,
        armor = armorPercent,
        hunger = hunger,
        thirst = thirst,
        stress = stress,
        cash = cash
    }
end

-- Get player info
local function GetPlayerInfo()
    local info = {
        name = "",
        phone = "",
        id = "",
        cid = ""
    }
    
    if PlayerData.charinfo then
        info.name = PlayerData.charinfo.firstname .. " " .. PlayerData.charinfo.lastname
        info.phone = PlayerData.charinfo.phone or ""
    end
    
    if PlayerData.citizenid then
        info.cid = PlayerData.citizenid
    end
    
    if PlayerData.source then
        info.id = PlayerData.source
    end
    
    return info
end

-- Open Inventory
RegisterNetEvent('qb-inventory:client:OpenInventory', function(data, inventory, other)
    if inInventory then return end
    
    inInventory = true
    currentOther = other
    
    -- Get player stats
    local stats = GetPlayerStats()
    local playerInfo = GetPlayerInfo()
    
    -- Calculate body damage (optional - based on limb health)
    local bodyDamage = 0
    local player = PlayerPedId()
    local totalLimbHealth = 0
    local limbCount = 0
    
    -- Check various bone groups for damage
    local bones = {0, 1, 2, 3, 4, 5} -- HEAD, NECK, CHEST, etc
    for _, bone in ipairs(bones) do
        local limbHealth = GetPedBoneIndex(player, bone)
        if limbHealth then
            limbCount = limbCount + 1
        end
    end
    
    -- Get max weight from config
    local maxWeight = Config.MaxInventoryWeight or 250000
    local maxSlots = Config.MaxInventorySlots or 40
    
    -- Prepare NUI data
    local nuiData = {
        action = "open",
        -- Player info
        pName = playerInfo.name,
        pNumber = playerInfo.phone,
        pID = playerInfo.id,
        pCID = playerInfo.cid,
        -- Player stats
        health = stats.health,
        armor = stats.armor,
        pStress = stats.stress,
        hunger = stats.hunger,
        thirst = stats.thirst,
        cash = stats.cash,
        pDamage = bodyDamage,
        -- Inventory data
        inventory = inventory,
        slots = maxSlots,
        maxweight = maxWeight,
        maxammo = Config.MaxAmmo or {},
        -- Other inventory (trunk, stash, shop, etc)
        other = other
    }
    
    SetNuiFocus(true, true)
    SendNUIMessage(nuiData)
    
    -- Play open sound
    PlaySound(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", false, 0, true)
end)

-- Close Inventory
RegisterNetEvent('qb-inventory:client:CloseInventory', function()
    CloseInventory()
end)

local function CloseInventory()
    if not inInventory then return end
    
    inInventory = false
    
    SetNuiFocus(false, false)
    SendNUIMessage({
        action = "close"
    })
    
    -- Save inventory state if needed
    if currentOther then
        TriggerServerEvent('qb-inventory:server:SaveInventory', currentOther.type or "drop", currentOther.id or 0)
    end
    
    currentOther = nil
    
    -- Play close sound
    PlaySound(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", false, 0, true)
end

-- Update Inventory
RegisterNetEvent('qb-inventory:client:UpdateInventory', function(inventory, other)
    if not inInventory then return end
    
    SendNUIMessage({
        action = "update",
        inventory = inventory,
        other = other
    })
end)

-- Item Box Notification
RegisterNetEvent('qb-inventory:client:ItemBox', function(itemData, type)
    SendNUIMessage({
        action = "itemBox",
        item = itemData,
        type = type
    })
end)

-- Use Weapon
RegisterNetEvent('qb-inventory:client:UseWeapon', function(weaponData, canUse)
    if canUse then
        -- Handle weapon equip
        local weaponName = weaponData.name
        local weaponHash = GetHashKey(weaponName)
        
        GiveWeaponToPed(PlayerPedId(), weaponHash, 0, false, true)
        
        if weaponData.info and weaponData.info.ammo then
            SetPedAmmo(PlayerPedId(), weaponHash, weaponData.info.ammo)
        end
        
        -- Handle attachments if any
        if weaponData.info and weaponData.info.attachments then
            for _, attachment in pairs(weaponData.info.attachments) do
                local attachmentHash = GetHashKey(attachment.component)
                GiveWeaponComponentToPed(PlayerPedId(), weaponHash, attachmentHash)
            end
        end
    else
        QBCore.Functions.Notify("This weapon is broken", "error")
    end
end)

-- NUI Callbacks

-- Close inventory from NUI
RegisterNUICallback('close', function(_, cb)
    CloseInventory()
    cb('ok')
end)

-- Play sounds
RegisterNUICallback('PlayDropSound', function(_, cb)
    PlaySound(-1, "PICK_UP", "HUD_FRONTEND_DEFAULT_SOUNDSET", false, 0, true)
    cb('ok')
end)

RegisterNUICallback('PlayOpenSound', function(_, cb)
    PlaySound(-1, "NAV_UP_DOWN", "HUD_FRONTEND_DEFAULT_SOUNDSET", false, 0, true)
    cb('ok')
end)

-- Use item
RegisterNUICallback('UseItem', function(data, cb)
    if data.inventory == "player" or data.inventory == "hotbar" then
        TriggerServerEvent('qb-inventory:server:UseItem', data.inventory, data.item)
    end
    cb('ok')
end)

-- Give item
RegisterNUICallback('GiveItem', function(data, cb)
    TriggerServerEvent('qb-inventory:server:GiveItem', data.inventory, data.item, data.amount)
    cb('ok')
end)

-- Set inventory data (move/swap items)
RegisterNUICallback('SetInventoryData', function(data, cb)
    TriggerServerEvent('qb-inventory:server:SetInventoryData', 
        data.fromInventory,
        data.toInventory,
        data.fromSlot,
        data.toSlot,
        data.fromAmount
    )
    cb('ok')
end)

-- Rob money
RegisterNUICallback('RobMoney', function(data, cb)
    TriggerServerEvent('qb-inventory:server:RobMoney', data.TargetId)
    cb('ok')
end)

-- Get combo data (for crafting/combining)
RegisterNUICallback('GetComboData', function(data, cb)
    local comboData = {}
    -- Check if items can be combined
    if data.item and data.item.combinable then
        comboData = data.item.combinable
    end
    cb(comboData)
end)

-- Player data update handler
RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    PlayerData = QBCore.Functions.GetPlayerData()
end)

RegisterNetEvent('QBCore:Client:OnPlayerUnload', function()
    PlayerData = {}
end)

RegisterNetEvent('QBCore:Player:SetPlayerData', function(val)
    PlayerData = val
    
    -- If inventory is open, update stats
    if inInventory then
        local stats = GetPlayerStats()
        SendNUIMessage({
            action = "updateStats",
            health = stats.health,
            armor = stats.armor,
            stress = stats.stress,
            hunger = stats.hunger,
            thirst = stats.thirst,
            cash = stats.cash
        })
    end
end)

-- Key binding for opening inventory
RegisterCommand('inventory', function()
    if not inInventory then
        TriggerServerEvent('qb-inventory:server:OpenInventory')
    else
        CloseInventory()
    end
end, false)

RegisterKeyMapping('inventory', 'Open Inventory', 'keyboard', 'TAB')

-- Close on death
AddEventHandler('gameEventTriggered', function(event, data)
    if event == "CEventNetworkEntityDamage" then
        local victim = data[1]
        local isDead = data[4]
        
        if victim == PlayerPedId() and isDead and inInventory then
            CloseInventory()
        end
    end
end)

-- Close when entering vehicle driver seat (optional)
CreateThread(function()
    while true do
        Wait(500)
        
        if inInventory then
            local ped = PlayerPedId()
            if IsPedInAnyVehicle(ped, false) and GetPedInVehicleSeat(GetVehiclePedIsIn(ped, false), -1) == ped then
                -- Player is driver, close inventory
                -- CloseInventory() -- Uncomment if you want this behavior
            end
        end
    end
end)

-- Hotbar usage (number keys 1-5)
for i = 1, 5 do
    RegisterCommand('hotbar' .. i, function()
        if not inInventory then
            TriggerServerEvent('qb-inventory:server:UseItemSlot', i)
        end
    end, false)
    
    RegisterKeyMapping('hotbar' .. i, 'Use Hotbar Slot ' .. i, 'keyboard', tostring(i))
end

-- Slot 6 (special slot)
RegisterCommand('hotbar6', function()
    if not inInventory then
        TriggerServerEvent('qb-inventory:server:UseItemSlot', 41)
    end
end, false)

RegisterKeyMapping('hotbar6', 'Use Hotbar Slot 6', 'keyboard', '6')

-- Initialize player data
CreateThread(function()
    while not QBCore do
        Wait(100)
    end
    
    PlayerData = QBCore.Functions.GetPlayerData()
end)

-- Drop item on ground
RegisterNetEvent('qb-inventory:client:DropItem', function(slot, amount)
    local ped = PlayerPedId()
    local coords = GetEntityCoords(ped)
    
    -- Play animation
    RequestAnimDict("pickup_object")
    while not HasAnimDictLoaded("pickup_object") do
        Wait(10)
    end
    
    TaskPlayAnim(ped, "pickup_object", "pickup_low", 8.0, -8.0, -1, 50, 0, false, false, false)
    Wait(1000)
    ClearPedTasks(ped)
end)

-- Remove drop from world
RegisterNetEvent('qb-inventory:client:RemoveDropItem', function(dropId)
    -- Handle visual drop removal if using prop drops
end)

-- Notify (fallback)
RegisterNetEvent('qb-inventory:client:Notify', function(message, type)
    QBCore.Functions.Notify(message, type or "primary")
end)
