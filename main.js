// ...existing code ...

function getElementColor(elementName) {
    // This is a simplified mapping. In a real application, you might have a more robust way to get element colors.
    const elementColors = {
        'Fire': '#ff4444',
        'Ice': '#00ffff',
        'Water': '#4444ff',
        'Plant': '#44ff44',
        'Electric': '#ffff44',
        'Darkness': '#4b0082',
        'Light': '#ffff80',
        'Earth': '#8b4513',
        'Wind': '#008080',
        'Noble': '#9370DB',
        'Poison': '#800080',
        'Cute': '#FFB6C1',
        'Undead': '#808000',
        'Arcane': '#8B008B',
        'Transformation': '#B8860B',
        'Reality': '#FF1493',
        'Spirit': '#98FB98',
        'Inanimate': '#00008B',
        'Metal': '#4A4A4A',
        'Animal': '#654321',
        'None': '#ffffff'
    };
    return elementColors[elementName] || '#ffffff'; // Default to white
}

function adjustColor(hex, percent) {
    const f = parseInt(hex.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;
    const R = f >> 16;
    const G = (f >> 8) & 0x00FF;
    const B = f & 0x0000FF;
    const newR = Math.round((t - R) * p) + R;
    const newG = Math.round((t - G) * p) + G;
    const newB = Math.round((t - B) * p) + B;
    return `#${(0x1000000 + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
}

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
        
        if (weapon.rarity === 'Transcendent') {
            const elements = [weapon.element, weapon.optionalElement1, weapon.optionalElement2].filter(e => e && e !== 'None');
            let color1 = '#ffffff';
            let color2 = '#eeeeee';

            if (elements.length > 0) {
                color1 = getElementColor(elements[0]);
                color2 = elements.length > 1 ? getElementColor(elements[1]) : adjustColor(color1, 0.2);
            }
            
            const glowColor = adjustColor(color1, 0.5);

            weaponElement.style.setProperty('--transcendent-gradient', `linear-gradient(45deg, ${color1}, ${color2})`);
            weaponElement.style.setProperty('--transcendent-color', color1);
            weaponElement.style.setProperty('--transcendent-glow', `rgba(${parseInt(glowColor.slice(1,3), 16)}, ${parseInt(glowColor.slice(3,5), 16)}, ${parseInt(glowColor.slice(5,7), 16)}, 0.4)`);
        }

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