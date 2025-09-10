// ...existing code ...

function displayWeapons(weapons) {
    const library = document.getElementById('weaponLibrary');
    library.innerHTML = '';
    
    // Get current search term
    const searchTerm = document.getElementById('weaponSearch').value.toLowerCase();
    
    // Filter weapons based on search term
    let filteredWeapons = weapons.filter(weapon => 
        weapon.name.toLowerCase().includes(searchTerm) ||
        weapon.description.toLowerCase().includes(searchTerm) ||
        weapon.type.toLowerCase().includes(searchTerm) ||
        (weapon.abilities && weapon.abilities.some(ability => 
            ability.toLowerCase().includes(searchTerm)
        ))
    );
    
    // Apply sorting
    const sortBy = document.getElementById('sortBy').value;
    filteredWeapons.sort((a, b) => {
        switch(sortBy) {
            case 'rarity-desc':
                const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Super-Epic', 'Legendary', 'Mythical', 'Transcendent'];
                return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
            case 'rarity-asc':
                const rarityOrderAsc = ['Common', 'Uncommon', 'Rare', 'Epic', 'Super-Epic', 'Legendary', 'Mythical', 'Transcendent'];
                return rarityOrderAsc.indexOf(a.rarity) - rarityOrderAsc.indexOf(b.rarity);
            case 'name':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'newest':
                return new Date(b.created_at) - new Date(a.created_at);
            case 'oldest':
                return new Date(a.created_at) - new Date(b.created_at);
            case 'damage-desc':
                return (b.damage || 0) - (a.damage || 0);
            case 'damage-asc':
                return (a.damage || 0) - (b.damage || 0);
            default:
                return new Date(b.created_at) - new Date(a.created_at);
        }
    });
    
    filteredWeapons.forEach(weapon => {
        const weaponElement = document.createElement('div');
        weaponElement.className = `weapon-list-item rarity-${weapon.rarity}`;
        
        // Add private class if weapon is private
        if (weapon.isPrivate) {
            weaponElement.classList.add('private');
        }
        
        weaponElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>${weapon.name}</span>
                ${weapon.isPrivate ? '🔒' : ''}
            </div>
            <small>${weapon.rarity} ${weapon.type}</small>
        `;
        
        weaponElement.onclick = () => selectWeapon(weapon);
        library.appendChild(weaponElement);
    });
}

// ...existing code ...