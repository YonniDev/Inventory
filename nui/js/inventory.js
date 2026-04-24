/**
 * QBCore Inventory - Redesigned UI
 * Dark Blue/Teal Theme with Body Stats Overlay
 */

const Inventory = {
    isOpen: false,
    playerSlots: 40,
    hotbarSlots: 5,
    dropSlots: 30,
    dropMaxWeight: 1000000,
    dropLabel: "GROUND",
    
    playerData: {
        inventory: [],
        maxWeight: 250000,
        currentWeight: 0
    },
    
    otherData: {
        inventory: [],
        maxWeight: 1000000,
        currentWeight: 0,
        label: "GROUND",
        name: ""
    },
    
    playerStats: {
        health: 100,
        armor: 0,
        stress: 0,
        hunger: 100,
        thirst: 100,
        cash: 0
    },
    
    draggedItem: null,
    draggedFromSlot: null,
    draggedFromInventory: null,
    selectedItem: null,
    
    // Image paths
    imagePath: "images/",
    
    init: function() {
        this.setupEventListeners();
        this.generateHotbarSlots();
        this.generateInventorySlots();
        this.generateSecondarySlots();
    },
    
    setupEventListeners: function() {
        const self = this;
        
        // Keyboard events
        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape" && self.isOpen) {
                self.close();
            }
        });
        
        // Search filter
        const searchInput = document.getElementById("inventory-search");
        if (searchInput) {
            searchInput.addEventListener("input", function(e) {
                self.filterInventory(e.target.value.toLowerCase());
            });
        }
        
        // Close secondary button
        const closeBtn = document.getElementById("close-secondary");
        if (closeBtn) {
            closeBtn.addEventListener("click", function() {
                self.close();
            });
        }
        
        // Document-level mouse events for dragging
        document.addEventListener("mousemove", function(e) {
            self.handleDragMove(e);
        });
        
        document.addEventListener("mouseup", function(e) {
            self.handleDragEnd(e);
        });
    },
    
    generateHotbarSlots: function() {
        const container = document.getElementById("hotbar-slots");
        if (!container) return;
        
        container.innerHTML = "";
        for (let i = 1; i <= this.hotbarSlots; i++) {
            const slot = this.createSlot(i, "player");
            slot.setAttribute("data-slot", i);
            container.appendChild(slot);
        }
    },
    
    generateInventorySlots: function() {
        const container = document.getElementById("inventory-grid");
        if (!container) return;
        
        container.innerHTML = "";
        for (let i = 6; i <= this.playerSlots; i++) {
            const slot = this.createSlot(i, "player");
            container.appendChild(slot);
        }
    },
    
    generateSecondarySlots: function(slotCount = 30) {
        const container = document.getElementById("secondary-grid");
        if (!container) return;
        
        container.innerHTML = "";
        for (let i = 1; i <= slotCount; i++) {
            const slot = this.createSlot(i, "other");
            container.appendChild(slot);
        }
    },
    
    createSlot: function(slotNumber, inventoryType) {
        const slot = document.createElement("div");
        slot.className = "inventory-slot";
        slot.setAttribute("data-slot", slotNumber);
        slot.setAttribute("data-inventory", inventoryType);
        
        const self = this;
        
        // Mouse events for drag and drop
        slot.addEventListener("mousedown", function(e) {
            if (e.button === 0) { // Left click
                self.handleDragStart(e, slot);
            }
        });
        
        slot.addEventListener("contextmenu", function(e) {
            e.preventDefault();
            self.handleRightClick(e, slot);
        });
        
        slot.addEventListener("mouseenter", function(e) {
            self.handleSlotHover(e, slot, true);
        });
        
        slot.addEventListener("mouseleave", function(e) {
            self.handleSlotHover(e, slot, false);
        });
        
        return slot;
    },
    
    // Open inventory
    open: function(data) {
        this.isOpen = true;
        
        // Reset weights
        this.playerData.currentWeight = 0;
        this.otherData.currentWeight = 0;
        
        // Update player info
        if (data.pID) {
            document.getElementById("player-id").textContent = data.pID;
        }
        if (data.pCID) {
            document.getElementById("player-cid").textContent = data.pCID;
        }
        
        // Update player stats
        this.updatePlayerStats({
            health: data.health || 100,
            armor: data.armor || 0,
            stress: data.pStress || 0,
            hunger: data.hunger || 100,
            thirst: data.thirst || 100,
            cash: data.cash || 0
        });
        
        // Set max weight
        this.playerData.maxWeight = data.maxweight || 250000;
        document.getElementById("max-weight").textContent = (this.playerData.maxWeight / 1000).toFixed(1);
        
        // Generate player inventory slots
        this.playerSlots = data.slots || 40;
        this.generateInventorySlots();
        
        // Populate player inventory
        if (data.inventory) {
            this.populateInventory(data.inventory, "player");
        }
        
        // Handle secondary inventory (other)
        if (data.other && data.other !== "") {
            this.otherData.name = data.other.name || "";
            this.otherData.label = data.other.label || "GROUND";
            this.otherData.maxWeight = data.other.maxweight || this.dropMaxWeight;
            
            document.getElementById("secondary-title").textContent = this.otherData.label.toUpperCase();
            document.getElementById("secondary-id").textContent = "";
            document.getElementById("secondary-max-weight").textContent = (this.otherData.maxWeight / 1000).toFixed(1);
            
            this.generateSecondarySlots(data.other.slots || this.dropSlots);
            
            if (data.other.inventory) {
                this.populateInventory(data.other.inventory, "other");
            }
        } else {
            // Ground inventory
            this.otherData.name = "drop";
            this.otherData.label = this.dropLabel;
            this.otherData.maxWeight = this.dropMaxWeight;
            
            document.getElementById("secondary-title").textContent = this.dropLabel;
            document.getElementById("secondary-id").textContent = "";
            document.getElementById("secondary-max-weight").textContent = (this.dropMaxWeight / 1000).toFixed(1);
            
            this.generateSecondarySlots(this.dropSlots);
        }
        
        // Update weight displays
        this.updateWeightDisplay("player");
        this.updateWeightDisplay("other");
        
        // Show inventory
        document.getElementById("inventory-container").classList.remove("hidden");
        
        // Play sound
        this.postNUI("PlayOpenSound", {});
    },
    
    // Close inventory
    close: function() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        document.getElementById("inventory-container").classList.add("hidden");
        this.hideTooltip();
        
        this.postNUI("close", {});
    },
    
    // Update player stats display
    updatePlayerStats: function(stats) {
        this.playerStats = { ...this.playerStats, ...stats };
        
        // Health
        const healthValue = document.getElementById("health-value");
        if (healthValue) {
            healthValue.textContent = `${Math.round(stats.health)}/100`;
        }
        
        // Armor
        const armorValue = document.getElementById("armor-value");
        if (armorValue) {
            armorValue.textContent = `${Math.round(stats.armor)}/100`;
        }
        
        // Stress
        const stressValue = document.getElementById("stress-value");
        if (stressValue) {
            stressValue.textContent = `${stats.stress.toFixed(2)}%`;
        }
        
        // Hunger
        const hungerValue = document.getElementById("hunger-value");
        if (hungerValue) {
            hungerValue.textContent = `${stats.hunger.toFixed(2)}%`;
        }
        
        // Thirst
        const thirstValue = document.getElementById("thirst-value");
        if (thirstValue) {
            thirstValue.textContent = `${stats.thirst.toFixed(2)}%`;
        }
        
        // Cash
        const cashValue = document.getElementById("cash-value");
        if (cashValue) {
            cashValue.textContent = `$${stats.cash.toLocaleString()}`;
        }
    },
    
    // Populate inventory with items
    populateInventory: function(items, inventoryType) {
        const self = this;
        let totalWeight = 0;
        
        items.forEach(function(item) {
            if (!item) return;
            
            const slotNum = item.slot;
            let container;
            
            if (inventoryType === "player") {
                if (slotNum <= 5) {
                    container = document.getElementById("hotbar-slots");
                } else {
                    container = document.getElementById("inventory-grid");
                }
            } else {
                container = document.getElementById("secondary-grid");
            }
            
            if (!container) return;
            
            const slot = container.querySelector(`[data-slot="${slotNum}"]`);
            if (!slot) return;
            
            // Calculate weight
            const itemWeight = (item.weight || 0) * (item.amount || 1);
            totalWeight += itemWeight;
            
            // Add item to slot
            self.setSlotItem(slot, item);
        });
        
        // Update weight
        if (inventoryType === "player") {
            this.playerData.currentWeight = totalWeight;
        } else {
            this.otherData.currentWeight = totalWeight;
        }
    },
    
    // Set item in slot
    setSlotItem: function(slot, item) {
        if (!item) {
            slot.innerHTML = "";
            slot.classList.remove("has-item");
            slot.removeAttribute("data-item");
            return;
        }
        
        slot.classList.add("has-item");
        slot.setAttribute("data-item", JSON.stringify(item));
        
        // Build slot HTML
        let html = "";
        
        // Item image
        html += `<img class="slot-image" src="${this.imagePath}${item.image}" alt="${item.name}" onerror="this.src='${this.imagePath}default.png'" />`;
        
        // Quantity
        if (item.amount && item.amount > 1) {
            html += `<span class="slot-quantity">${item.amount}x</span>`;
        }
        
        // Price (for shops)
        if (item.price) {
            html += `<span class="slot-price">$${item.price}</span>`;
        }
        
        // Item name
        html += `<span class="slot-name">${item.label || item.name}</span>`;
        
        // Durability bar (for weapons/items with durability)
        if (item.info && item.info.quality !== undefined) {
            const durability = item.info.quality;
            const durabilityColor = this.getDurabilityColor(durability);
            html += `
                <div class="slot-durability">
                    <div class="durability-fill" style="width: ${durability}%; background-color: ${durabilityColor};"></div>
                </div>
            `;
        }
        
        slot.innerHTML = html;
    },
    
    // Get durability color
    getDurabilityColor: function(durability) {
        if (durability > 75) return "var(--durability-full)";
        if (durability > 50) return "var(--durability-high)";
        if (durability > 25) return "var(--durability-medium)";
        if (durability > 10) return "var(--durability-low)";
        return "var(--durability-critical)";
    },
    
    // Update weight display
    updateWeightDisplay: function(inventoryType) {
        if (inventoryType === "player") {
            const current = document.getElementById("current-weight");
            if (current) {
                current.textContent = (this.playerData.currentWeight / 1000).toFixed(1);
            }
        } else {
            const current = document.getElementById("secondary-current-weight");
            if (current) {
                current.textContent = (this.otherData.currentWeight / 1000).toFixed(1);
            }
        }
    },
    
    // Filter inventory by search term
    filterInventory: function(searchTerm) {
        const slots = document.querySelectorAll("#inventory-grid .inventory-slot, #hotbar-slots .inventory-slot");
        
        slots.forEach(function(slot) {
            const itemData = slot.getAttribute("data-item");
            if (!itemData) {
                slot.style.opacity = searchTerm ? "0.3" : "1";
                return;
            }
            
            try {
                const item = JSON.parse(itemData);
                const itemName = (item.label || item.name || "").toLowerCase();
                
                if (searchTerm === "" || itemName.includes(searchTerm)) {
                    slot.style.opacity = "1";
                } else {
                    slot.style.opacity = "0.3";
                }
            } catch (e) {
                slot.style.opacity = "1";
            }
        });
    },
    
    // Drag and drop handlers
    handleDragStart: function(e, slot) {
        const itemData = slot.getAttribute("data-item");
        if (!itemData) return;
        
        try {
            this.draggedItem = JSON.parse(itemData);
            this.draggedFromSlot = parseInt(slot.getAttribute("data-slot"));
            this.draggedFromInventory = slot.getAttribute("data-inventory");
            
            slot.classList.add("dragging");
            
            // Show drag preview
            const preview = document.getElementById("drag-preview");
            const previewImg = document.getElementById("drag-image");
            const previewQty = document.getElementById("drag-quantity");
            
            if (preview && previewImg) {
                previewImg.src = this.imagePath + this.draggedItem.image;
                if (previewQty) {
                    previewQty.textContent = this.draggedItem.amount > 1 ? this.draggedItem.amount + "x" : "";
                }
                preview.classList.remove("hidden");
                preview.style.left = e.clientX - 35 + "px";
                preview.style.top = e.clientY - 35 + "px";
            }
            
            this.hideTooltip();
        } catch (err) {
            console.error("Error starting drag:", err);
        }
    },
    
    handleDragMove: function(e) {
        if (!this.draggedItem) return;
        
        const preview = document.getElementById("drag-preview");
        if (preview) {
            preview.style.left = e.clientX - 35 + "px";
            preview.style.top = e.clientY - 35 + "px";
        }
        
        // Highlight slot under cursor
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const targetSlot = element ? element.closest(".inventory-slot") : null;
        
        document.querySelectorAll(".inventory-slot.drag-over").forEach(function(s) {
            s.classList.remove("drag-over");
        });
        
        if (targetSlot) {
            targetSlot.classList.add("drag-over");
        }
    },
    
    handleDragEnd: function(e) {
        if (!this.draggedItem) return;
        
        // Hide preview
        const preview = document.getElementById("drag-preview");
        if (preview) {
            preview.classList.add("hidden");
        }
        
        // Remove drag states
        document.querySelectorAll(".inventory-slot.dragging, .inventory-slot.drag-over").forEach(function(s) {
            s.classList.remove("dragging", "drag-over");
        });
        
        // Find target slot
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const targetSlot = element ? element.closest(".inventory-slot") : null;
        
        if (targetSlot) {
            const toSlot = parseInt(targetSlot.getAttribute("data-slot"));
            const toInventory = targetSlot.getAttribute("data-inventory");
            
            // Perform swap/move
            this.moveItem(
                this.draggedFromSlot,
                toSlot,
                this.draggedFromInventory,
                toInventory,
                this.draggedItem.amount
            );
        }
        
        // Reset drag state
        this.draggedItem = null;
        this.draggedFromSlot = null;
        this.draggedFromInventory = null;
    },
    
    // Move item between slots
    moveItem: function(fromSlot, toSlot, fromInventory, toInventory, amount) {
        if (fromSlot === toSlot && fromInventory === toInventory) return;
        
        this.postNUI("SetInventoryData", {
            fromSlot: fromSlot,
            toSlot: toSlot,
            fromInventory: fromInventory,
            toInventory: toInventory,
            fromAmount: amount
        });
        
        this.postNUI("PlayDropSound", {});
    },
    
    // Right click handler (use item)
    handleRightClick: function(e, slot) {
        const itemData = slot.getAttribute("data-item");
        if (!itemData) return;
        
        try {
            const item = JSON.parse(itemData);
            const inventoryType = slot.getAttribute("data-inventory");
            
            // Show tooltip with actions
            this.showTooltip(e, item, true);
            this.selectedItem = { item: item, slot: slot, inventory: inventoryType };
        } catch (err) {
            console.error("Error on right click:", err);
        }
    },
    
    // Hover handler
    handleSlotHover: function(e, slot, isEntering) {
        if (this.draggedItem) return; // Don't show tooltip while dragging
        
        if (isEntering) {
            const itemData = slot.getAttribute("data-item");
            if (itemData) {
                try {
                    const item = JSON.parse(itemData);
                    this.showTooltip(e, item, false);
                } catch (err) {}
            }
        } else {
            // Only hide if not showing split actions
            if (!this.selectedItem) {
                this.hideTooltip();
            }
        }
    },
    
    // Tooltip display
    showTooltip: function(e, item, showActions) {
        const tooltip = document.getElementById("item-tooltip");
        if (!tooltip) return;
        
        // Update tooltip content
        document.getElementById("tooltip-name").textContent = item.label || item.name;
        document.getElementById("tooltip-quantity").textContent = (item.amount || 1) + "x";
        
        // Weight
        const weightLbs = ((item.weight || 0) * (item.amount || 1) / 1000).toFixed(2);
        document.getElementById("tooltip-weight").textContent = `Weight: ${weightLbs} lbs`;
        
        // Info (serial number, etc)
        const infoEl = document.getElementById("tooltip-info");
        if (item.info && Object.keys(item.info).length > 0) {
            let infoText = "";
            if (item.info.serie) {
                infoText += `Serial: ${item.info.serie}`;
            }
            infoEl.textContent = infoText;
            infoEl.style.display = infoText ? "block" : "none";
        } else {
            infoEl.style.display = "none";
        }
        
        // Durability
        const durabilitySection = document.getElementById("tooltip-durability");
        if (item.info && item.info.quality !== undefined) {
            const durability = item.info.quality;
            durabilitySection.style.display = "flex";
            document.getElementById("tooltip-durability-fill").style.width = durability + "%";
            document.getElementById("tooltip-durability-fill").style.backgroundColor = this.getDurabilityColor(durability);
            document.getElementById("tooltip-durability-value").textContent = durability + "%";
        } else {
            durabilitySection.style.display = "none";
        }
        
        // Description
        const descEl = document.getElementById("tooltip-description");
        if (item.description) {
            descEl.textContent = item.description;
            descEl.style.display = "block";
        } else {
            descEl.style.display = "none";
        }
        
        // Split actions
        const splitContainer = document.getElementById("split-container");
        if (showActions && item.amount > 1) {
            splitContainer.classList.remove("hidden");
            document.getElementById("split-amount").value = 1;
            document.getElementById("split-amount").max = item.amount - 1;
        } else {
            splitContainer.classList.add("hidden");
        }
        
        // Position tooltip
        tooltip.classList.remove("hidden");
        
        const tooltipRect = tooltip.getBoundingClientRect();
        let x = e.clientX + 15;
        let y = e.clientY + 15;
        
        // Keep within viewport
        if (x + tooltipRect.width > window.innerWidth) {
            x = e.clientX - tooltipRect.width - 15;
        }
        if (y + tooltipRect.height > window.innerHeight) {
            y = e.clientY - tooltipRect.height - 15;
        }
        
        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";
    },
    
    hideTooltip: function() {
        const tooltip = document.getElementById("item-tooltip");
        if (tooltip) {
            tooltip.classList.add("hidden");
        }
        this.selectedItem = null;
    },
    
    // Use item
    useItem: function(item, inventory) {
        this.close();
        this.postNUI("UseItem", {
            inventory: inventory,
            item: item
        });
    },
    
    // Split item
    splitItem: function() {
        if (!this.selectedItem) return;
        
        const amount = parseInt(document.getElementById("split-amount").value);
        if (amount <= 0 || amount >= this.selectedItem.item.amount) return;
        
        // Find first empty slot
        const emptySlot = this.findFirstEmptySlot(this.selectedItem.inventory);
        if (!emptySlot) {
            // No empty slot available
            return;
        }
        
        this.postNUI("SetInventoryData", {
            fromSlot: this.selectedItem.item.slot,
            toSlot: emptySlot,
            fromInventory: this.selectedItem.inventory,
            toInventory: this.selectedItem.inventory,
            fromAmount: amount
        });
        
        this.hideTooltip();
    },
    
    // Find first empty slot
    findFirstEmptySlot: function(inventoryType) {
        const container = inventoryType === "player" 
            ? document.getElementById("inventory-grid")
            : document.getElementById("secondary-grid");
        
        if (!container) return null;
        
        const slots = container.querySelectorAll(".inventory-slot");
        for (let slot of slots) {
            if (!slot.getAttribute("data-item")) {
                return parseInt(slot.getAttribute("data-slot"));
            }
        }
        return null;
    },
    
    // Post to NUI (FiveM)
    postNUI: function(action, data) {
        fetch(`https://qb-inventory/${action}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }).catch(function(err) {
            // Silently fail if not in FiveM
        });
    },
    
    // Update inventory after server response
    update: function(data) {
        // Re-populate inventories with new data
        if (data.inventory) {
            // Clear current items
            document.querySelectorAll("#hotbar-slots .inventory-slot, #inventory-grid .inventory-slot").forEach(slot => {
                this.setSlotItem(slot, null);
            });
            
            this.playerData.currentWeight = 0;
            this.populateInventory(data.inventory, "player");
            this.updateWeightDisplay("player");
        }
        
        if (data.other && data.other.inventory) {
            // Clear current items
            document.querySelectorAll("#secondary-grid .inventory-slot").forEach(slot => {
                this.setSlotItem(slot, null);
            });
            
            this.otherData.currentWeight = 0;
            this.populateInventory(data.other.inventory, "other");
            this.updateWeightDisplay("other");
        }
    }
};

// Initialize on load
window.onload = function() {
    Inventory.init();
    
    // Listen for NUI messages
    window.addEventListener("message", function(event) {
        const data = event.data;
        
        switch (data.action) {
            case "open":
                Inventory.open(data);
                break;
            case "close":
                Inventory.close();
                break;
            case "update":
                Inventory.update(data);
                break;
            case "updateStats":
                Inventory.updatePlayerStats(data);
                break;
        }
    });
    
    // Split button handler
    document.getElementById("split-btn").addEventListener("click", function() {
        Inventory.splitItem();
    });
    
    // Close tooltip on document click
    document.addEventListener("click", function(e) {
        const tooltip = document.getElementById("item-tooltip");
        if (tooltip && !tooltip.contains(e.target) && !e.target.closest(".inventory-slot")) {
            Inventory.hideTooltip();
        }
    });
};
