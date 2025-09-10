function adjustColor(color, percent) {
  if (!color) return '#ffffff';
  
  // Handle named colors by converting to hex
  const namedColors = {
    white: '#ffffff',
    black: '#000000'
    // Add other common colors as needed
  };
  
  if (namedColors[color.toLowerCase()]) {
    color = namedColors[color.toLowerCase()];
  }

  // If color doesn't start with #, return white
  if (!color.startsWith('#')) return '#ffffff';

  try {
    const num = parseInt(color.replace('#', ''), 16),
          amt = Math.round(2.55 * percent),
          R = Math.min(255, Math.max(0, (num >> 16) + amt)),
          G = Math.min(255, Math.max(0, (num >> 8 & 0x00FF) + amt)),
          B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + (R * 0x10000) + (G * 0x100) + B).toString(16).slice(1);
  } catch (e) {
    console.error('Error adjusting color:', e);
    return '#ffffff';
  }
}
const room = new WebsimSocket();
async function generateWeapon() {
  const weaponName = document.getElementById('weaponName').value;
  const weaponDescription = document.getElementById('weaponDescription').value || '';
  const weaponContext = document.getElementById('weaponContext').value || '';
  const weaponType = document.getElementById('weaponType').value;
  const optionalType1 = document.getElementById('optionalWeaponType1').value;
  const optionalType2 = document.getElementById('optionalWeaponType2').value;
  const weaponElement = document.getElementById('weaponElement').value;
  const optionalElement1 = document.getElementById('optionalElement1').value;
  const optionalElement2 = document.getElementById('optionalElement2').value;
  const weaponRarity = document.getElementById('weaponRarity').value;
  const allTypes = [weaponType, optionalType1, optionalType2].filter(t => t).join(' + ');
  const allElements = [weaponElement, optionalElement1, optionalElement2].filter(e => e).join(' + ');
  if (!weaponName) {
    alert('Please provide a name for your weapon!');
    return;
  }
  document.getElementById('loading').style.display = 'block';
  try {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "user", 
          content: `Generate detailed weapon stats for a ${allTypes} weapon named "${weaponName}"
            ${weaponDescription ? ` with the following description: ${weaponDescription}` : ''}
            ${allElements ? ` with ${allElements} element` : ''}
            ${weaponRarity ? ` with ${weaponRarity} rarity` : ''}
            ${weaponContext ? `\nAdditional context: ${weaponContext}` : ''}.
            Include damage, element (${allElements ? `must be ${allElements}` : `from: None, Fire, Ice, Water, Plant, Electric, Darkness, Light, Earth, Wind, Noble, Poison, Cute, Undead, Arcane, Transformation, Reality, Spirit, Inanimate, Metal, Animal`}), 
            regular attack (REQUIRED for ALL weapons), passive effects (only for Uncommon+ weapons), appearance, rarity (${weaponRarity ? `must be exactly ${weaponRarity}` : 'from: Common, Uncommon, Rare, Epic, Super-Epic, Legendary, Mythical, Transcendent'}), price in gold, and a short, impactful flavor blurb.
            The weapon's name and abilities should be thematically aligned with the provided description if one was given.
            The flavor blurb should be a brief, memorable line focused on the weapon's characteristics - its element, appearance, function and overall theme - rather than its specific name. Make it charming, funny, somber, or empowering based on these traits.${weaponContext ? '\nEnsure the weapon aligns with the provided context.' : ''}
            
            ${weaponRarity ? 'Important: The rarity MUST be exactly ' + weaponRarity : ''}
            ${allElements ? 'Important: The element(s) MUST be exactly ' + allElements : ''}
            
            Respond directly with JSON, following this JSON schema, and no other text:
            {
                "damage": number,
                "element": string,
                "specialAbility": string,  // Regular attack for ALL rarities
                "passiveEffects": string,
                "appearance": string,
                "rarity": string,
                "price": number,
                "flavorBlurb": string
            }`
        }
      ],
      json: true
    });

    const weaponStats = JSON.parse(completion.content);
    const isPrivate = document.getElementById('weaponPrivacy').checked;
    await room.collection('weapons').create({
      name: weaponName,
      description: weaponDescription,
      context: weaponContext,
      isPrivate,
      creatorId: room.party.client.id,
      ...weaponStats
    });
    document.getElementById('weaponName').value = '';
    document.getElementById('weaponDescription').value = '';
    document.getElementById('weaponContext').value = '';
  } catch (error) {
    console.error('Error:', error);
    alert(error.message || 'Failed to generate weapon. Please try again.');
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}
function createWeaponCard(weapon, detailed = false) {
  let html = `
    <h3>${weapon.name}</h3>
    <div class="flavor-blurb">${weapon.flavorBlurb}</div>
    ${weapon.description ? `<p>Description: ${weapon.description}</p>` : ''}
    <p>Damage: <span class="number">${weapon.damage}</span></p>
    <p class="rarity-${weapon.rarity}">Rarity: ${weapon.rarity}</p>
    <p>Price: <span class="number">${weapon.price}</span> gold</p>
    <p class="element-${weapon.element}">Element: ${getElementEmoji(weapon.element)} ${weapon.element}</p>
    <p>Appearance: ${weapon.appearance}</p>
    <p>Regular Attack: ${weapon.specialAbility}</p>
  `;
  
  if (weapon.rarity !== 'Common' && weapon.passiveEffects) {
    html += `<p>Passive: ${weapon.passiveEffects}</p>`;
  }

  if (weapon.additionalAbilities) {
    weapon.additionalAbilities.forEach(ability => {
      html += `<p>Additional Ability: ${ability}</p>`;
    });
  }

  if (weapon.specialZones) {
    weapon.specialZones.forEach(zone => {
      html += `<p>Special Zone: ${zone}</p>`;
    });
  }

  if (weapon.uniqueTraits) {
    weapon.uniqueTraits.forEach(trait => {
      html += `<p>Unique Trait: ${trait}</p>`;
    });
  }

  html += `
    <button class="edit-btn" onclick="editWeapon('${weapon.id}')">✎</button>
    <button class="download-btn" onclick="downloadWeapon('${weapon.id}')">⭳</button>
    <button class="delete-btn" onclick="deleteWeapon('${weapon.id}')">×</button>
    <div class="battle-logs-header" onclick="toggleBattleLogs('${weapon.id}')">
      <span class="toggle-icon">▼</span>
      <h4>Battle History</h4>
      <span class="battle-count">${weapon.battleLogs?.length || 0} battles</span>
    </div>
    <div class="battle-logs-content" id="battle-logs-${weapon.id}">
      <div class="battle-logs-list">
        ${weapon.battleLogs ? weapon.battleLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).map(log => `
          <div class="weapon-battle-log">
            <div class="battle-outcome ${log.winner === weapon.name ? 'victory' : 'defeat'}">
              ${log.winner === weapon.name ? 'Victory' : 'Defeat'} at ${log.location} (${log.goreLevel})
            </div>
            <div class="battle-description">${log.description}</div>
            <div class="battle-details">
              <small>${new Date(log.timestamp).toLocaleString()}</small>
            </div>
          </div>
        `).join('') : '<p>No battles recorded yet.</p>'}
      </div>
    </div>
  `;
  if (weapon.rarity === 'Transcendent') {
    const elementColors = {
      'None': '#ffffff',
      'Fire': '#ff4444',
      'Ice': '#00ffff', 
      'Water': '#4444ff',
      'Plant': '#44ff44',
      'Electric': '#ffff44',
      'Darkness': '#4b0082',
      'Light': '#ffff80',
      'Earth': '#8b4513',
      'Wind': '#008080',
      'Poison': '#800080',
      'Cute': '#FFB6C1',
      'Noble': '#9370DB',
      'Undead': '#808000',
      'Arcane': '#8B008B',
      'Transformation': '#B8860B',
      'Reality': '#FF1493',
      'Spirit': '#98FB98',
      'Inanimate': '#00008B',
      'Metal': '#4A4A4A',
      'Animal': '#654321'
    };

    // Add custom element colors
    const customElements = {};
    room.collection('elements').getList().forEach(elem => {
      elementColors[elem.name] = elem.color;
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `.element-${elem.name} { color: ${elem.color}; }`;
      document.head.appendChild(styleSheet);
    });

    const elements = [weapon.element].concat(weapon.optionalElement1 || [], weapon.optionalElement2 || []).filter(Boolean);
    
    let gradient, color;
    if (elements.length > 0) {
      const colors = elements.map(e => elementColors[e] || '#ffffff');
      gradient = colors.length === 1 
        ? `linear-gradient(45deg, ${colors[0]}, ${colors[0]})`
        : `linear-gradient(45deg, ${colors.join(', ')})`;
      color = colors[0];
    } else {
      gradient = 'linear-gradient(45deg, #ffffff, #ffffff)';
      color = '#ffffff';
    }

    const cardStyle = document.createElement('style');
    cardStyle.textContent = `
      .weapon-card.rarity-Transcendent[data-weapon-id="${weapon.id}"],
      .weapon-list-item.rarity-Transcendent[data-weapon-id="${weapon.id}"] {
        --transcendent-gradient: ${gradient};
        --transcendent-color: ${color};
        --transcendent-glow: rgba(255,255,255,0.4);
      }
    `;
    document.head.appendChild(cardStyle);
  }

  // Add helper function to convert hex to RGB
  function adjustColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16),
          amt = Math.round(2.55 * percent),
          R = (num >> 16) + amt,
          G = (num >> 8 & 0x00FF) + amt,
          B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
  }

  return html;
}

room.collection('weapons').subscribe(weapons => {
  displayWeapons(weapons);
  
  // Update battle logs for displayed weapon
  const selectedWeapon = document.getElementById('selectedWeapon');
  if (selectedWeapon && selectedWeapon.children.length) {
    const weaponCard = selectedWeapon.children[0];
    const weaponId = weaponCard.dataset.weaponId;
    if (weaponId) {
      updateWeaponBattleLogs(weaponId);
    }
  }
});
function displayWeapons(weapons) {
  const library = document.getElementById('weaponLibrary');
  library.innerHTML = '';
  let visibleWeapons = weapons.filter(weapon => {
    return !weapon.isPrivate || weapon.creatorId === room.party.client.id;
  });
  const searchText = document.getElementById('weaponSearch')?.value.toLowerCase();
  if (searchText) {
    visibleWeapons = visibleWeapons.filter(weapon => {
      return weapon?.name?.toLowerCase().includes(searchText) || weapon?.description?.toLowerCase().includes(searchText) || weapon?.element?.toLowerCase().includes(searchText) || weapon?.rarity?.toLowerCase().includes(searchText) || weapon?.passiveEffects?.toLowerCase().includes(searchText) || weapon?.specialAbility?.toLowerCase().includes(searchText) || weapon?.appearance?.toLowerCase().includes(searchText) || weapon?.flavorBlurb?.toLowerCase().includes(searchText) || weapon?.additionalAbilities?.some(ability => ability.toLowerCase().includes(searchText)) || weapon?.specialZones?.some(zone => zone.toLowerCase().includes(searchText)) || weapon?.uniqueTraits?.some(trait => trait.toLowerCase().includes(searchText));
    });
  }
  const sortBy = document.getElementById('sortBy')?.value;
  const rarityOrder = {
    'Common': 0,
    'Uncommon': 1,
    'Rare': 2,
    'Epic': 3,
    'Super-Epic': 4,
    'Legendary': 5,
    'Mythical': 6,
    'Transcendent': 7
  };
  visibleWeapons.sort((a, b) => {
    switch (sortBy) {
      case 'rarity-desc':
        return (rarityOrder[b?.rarity || 'Common'] || 0) - (rarityOrder[a?.rarity || 'Common'] || 0);
      case 'rarity-asc':
        return (rarityOrder[a?.rarity || 'Common'] || 0) - (rarityOrder[b?.rarity || 'Common'] || 0);
      case 'name':
        return (a?.name || '').localeCompare(b?.name || '');
      case 'name-desc':
        return (b?.name || '').localeCompare(a?.name || '');
      case 'newest':
        return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
      case 'oldest':
        return new Date(a?.created_at || 0) - new Date(b?.created_at || 0);
      case 'damage-desc':
        return (b?.damage || 0) - (a?.damage || 0);
      case 'damage-asc':
        return (a?.damage || 0) - (b?.damage || 0);
      default:
        const rarityDiff = (rarityOrder[b?.rarity || 'Common'] || 0) - (rarityOrder[a?.rarity || 'Common'] || 0);
        if (rarityDiff === 0) {
          return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
        }
        return rarityDiff;
    }
  });
  visibleWeapons.forEach(weapon => {
    if (weapon.rarity === 'Transcendent') {
      const elementColors = {
        'None': '#ffffff',
        'Fire': '#ff4444',
        'Ice': '#00ffff', 
        'Water': '#4444ff',
        'Plant': '#44ff44',
        'Electric': '#ffff44',
        'Darkness': '#4b0082',
        'Light': '#ffff80',
        'Earth': '#8b4513',
        'Wind': '#008080',
        'Poison': '#800080',
        'Cute': '#FFB6C1',
        'Noble': '#9370DB',
        'Undead': '#808000',
        'Arcane': '#8B008B',
        'Transformation': '#B8860B',
        'Reality': '#FF1493',
        'Spirit': '#98FB98',
        'Inanimate': '#00008B',
        'Metal': '#4A4A4A',
        'Animal': '#654321'
      };

      // Add custom element colors
      room.collection('elements').getList().forEach(elem => {
        elementColors[elem.name] = elem.color;
      });

      const elements = [weapon.element].concat(weapon.optionalElement1 || [], weapon.optionalElement2 || []).filter(Boolean);
      
      let gradient, color;
      if (elements.length > 0) {
        const colors = elements.map(e => elementColors[e] || '#ffffff');
        gradient = colors.length === 1 
          ? `linear-gradient(45deg, ${colors[0]}, ${colors[0]})`
          : `linear-gradient(45deg, ${colors.join(', ')})`;
        color = colors[0];
      } else {
        gradient = 'linear-gradient(45deg, #ffffff, #ffffff)';
        color = '#ffffff';
      }

      const cardStyle = document.createElement('style');
      cardStyle.textContent = `
        .weapon-card.rarity-Transcendent[data-weapon-id="${weapon.id}"],
        .weapon-list-item.rarity-Transcendent[data-weapon-id="${weapon.id}"] {
          --transcendent-gradient: ${gradient};
          --transcendent-color: ${color};
          --transcendent-glow: rgba(255,255,255,0.4);
        }
      `;
      document.head.appendChild(cardStyle);
    }

    const item = document.createElement('div');
    item.className = `weapon-list-item rarity-${weapon?.rarity || 'Common'}`;
    item.dataset.weaponId = weapon.id;
    if (weapon.isPrivate) {
      item.classList.add('private');
    }
    item.textContent = weapon?.name || 'Unnamed Weapon';
    item.onclick = () => {
      const selectedSection = document.getElementById('selectedWeapon');
      const detailedCard = document.createElement('div');
      detailedCard.className = `weapon-card rarity-${weapon?.rarity || 'Common'}`;
      detailedCard.innerHTML = createWeaponCard(weapon, true);
      detailedCard.dataset.weaponId = weapon.id;
      selectedSection.innerHTML = '';
      selectedSection.appendChild(detailedCard);
    };
    library.appendChild(item);
  });
}
function updateWeaponBattleLogs(weaponId) {
  const logContainer = document.querySelector(`.weapon-battle-logs[data-weapon-id="${weaponId}"] .battle-logs-list`);
  if (!logContainer) return;

  const weapon = room.collection('weapons').getList().find(w => w.id === weaponId);
  if (!weapon || !weapon.battleLogs) {
    logContainer.innerHTML = '<p>No battles recorded yet.</p>';
    return;
  }

  const logs = weapon.battleLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  logContainer.innerHTML = logs.map(log => `
    <div class="battle-log-item">
      <p>${log.isTeamBattle ? 'Team Battle' : 'Duel'} at ${log.location} (${log.goreLevel})</p>
      <p>Result: ${log.winner === weapon.name ? 'Victory' : 'Defeat'}</p>
      <div class="battle-description">${log.description}</div>
      <small>${new Date(log.timestamp).toLocaleString()}</small>
    </div>
  `).join('');
}

room.collection('weapons').subscribe(weapons => {
  displayWeapons(weapons);
  
  // Update battle logs for displayed weapon
  const selectedWeapon = document.getElementById('selectedWeapon');
  if (selectedWeapon && selectedWeapon.children.length) {
    const weaponCard = selectedWeapon.children[0];
    const weaponId = weaponCard.dataset.weaponId;
    if (weaponId) {
      updateWeaponBattleLogs(weaponId);
    }
  }
});
function updateBattleLogsForDisplayedWeapon() {
  const selectedWeapon = document.getElementById('selectedWeapon');
  if (selectedWeapon && selectedWeapon.children.length) {
    const weaponCard = selectedWeapon.children[0];
    const weaponId = weaponCard.dataset.weaponId;
    if (weaponId) {
      updateWeaponBattleLogs(weaponId);
    }
  }
}
async function startBattle() {
  const weapon1Id = document.getElementById('weapon1').value;
  const weapon2Id = document.getElementById('weapon2').value;
  const goreLevel = document.getElementById('goreIntensity').value;
  const location = document.getElementById('battleLocation').value || 'Arena';
  if (!weapon1Id || !weapon2Id) {
    alert('Please select two weapons!');
    return;
  }
  document.getElementById('battleLoading').style.display = 'block';
  document.getElementById('winnerAnnouncement').style.display = 'none';
  const revealBtn = document.createElement('button');
  revealBtn.className = 'reveal-winner-btn';
  revealBtn.textContent = 'Reveal Outcome';
  const weapons = room.collection('weapons').getList();
  const weapon1 = weapons.find(w => w.id === weapon1Id);
  const weapon2 = weapons.find(w => w.id === weapon2Id);
  const colorize = (text, weapons) => {
    let colorized = text;
    weapons.forEach(weapon => {
      const regex = new RegExp(weapon.name, 'g');
      colorized = colorized.replace(regex, `<span class="element-${weapon.element}" style="color: var(--${weapon.rarity.toLowerCase()}-color)">${weapon.name}</span>`);
    });
    return colorized;
  };
  try {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Create an epic battle scene between two fighters wielding these weapons in the ${location}:
          
          Weapon 1: ${JSON.stringify(weapon1)}
          Weapon 1 Battle History: ${weapon1.battleLogs?.length || 0} previous battles
          Previous fighting style: ${summarizeBattleHistory(weapon1.battleLogs || [])}
          
          Weapon 2: ${JSON.stringify(weapon2)}
          Weapon 2 Battle History: ${weapon2.battleLogs?.length || 0} previous battles
          Previous fighting style: ${summarizeBattleHistory(weapon2.battleLogs || [])}
          
          Gore Level: ${goreLevel}
          Gore Guidelines:
          - Tame: Blood, bruises and small cuts only
          - Violent: Deep cuts, massive bleeding, and bone breaks
          - Bloodbath: [Extremely graphic] Intense dismemberment, visceral gore, guttural screams, sadistic enjoyment, brutal psychological elements${goreLevel === 'Bloodbath' ? '. Make it extremely dark and disturbing, with vivid descriptions and dialogue showing the characters\' descent into madness' : ''}
          
          Generate a dramatic battle scene with two named fighters.
          The battle can end in a decisive victory for either fighter, or a tie if both are equally matched.
          Include plenty of character dialogue to show their personalities and reactions.
          Consider the weapons' elements, abilities, and characteristics in the fight.
          Match the gore level specified.
          Use more line breaks between paragraphs and dialogue.

          Respond directly with JSON, following this JSON schema, and no other text:
          {
            "battleDescription": "Multi-paragraph battle description with dialogue", 
            "outcome": {
              "winner": "weapon1Id|weapon2Id|tie",
              "finalState": "Description of both fighters' conditions at the end"
            }
          }`
        }
      ],
      json: true
    });

    const result = JSON.parse(completion.content);
    const battleDesc = document.getElementById('battleDescription');
    battleDesc.innerHTML = colorize(result.battleDescription, [weapon1, weapon2]);
    const announcement = document.getElementById('winnerAnnouncement');
    announcement.innerHTML = '';
    announcement.style.display = 'none';
    revealBtn.onclick = async () => {
      announcement.style.display = 'block';
      let winnerWeapon;
      if (result.outcome.winner === 'tie') {
        announcement.innerHTML = `The battle ends in a draw! Both fighters are equally matched.`;
      } else {
        winnerWeapon = weapons.find(w => w.id === result.outcome.winner);
        announcement.innerHTML = `The victor wields: <span style="color: var(--${winnerWeapon.rarity.toLowerCase()}-color)">${winnerWeapon.name}</span>!`;
      }
      announcement.innerHTML += `<br><br><small>${result.outcome.finalState}</small>`;
      announcement.classList.add('revealed');

      // Update battle logs for both weapons
      const battleLog = {
        timestamp: new Date().toISOString(),
        location: location,
        goreLevel: goreLevel,
        description: result.battleDescription,
        winner: result.outcome.winner === 'tie' ? 'Draw' : winnerWeapon.name,
        finalState: result.outcome.finalState
      };

      for (const weapon of [weapon1, weapon2]) {
        const battleLogs = weapon.battleLogs || [];
        await room.collection('weapons').update(weapon.id, {
          battleLogs: [...battleLogs, battleLog]
        });
      }

      // Update displayed battle logs if weapon card is visible
      const selectedWeapon = document.getElementById('selectedWeapon');
      if (selectedWeapon && selectedWeapon.children.length) {
        const weaponCard = selectedWeapon.children[0];
        const weaponId = weaponCard.dataset.weaponId;
        if (weaponId === weapon1.id || weaponId === weapon2.id) {
          updateWeaponBattleLogs(weaponId);
        }
      }
    };
    battleDesc.appendChild(revealBtn);
  } catch (error) {
    console.error('Battle generation error:', error);
    alert(error.message || 'Failed to generate battle. Please try again.');
  } finally {
    document.getElementById('battleLoading').style.display = 'none';
  }
}
function getRarityColor(rarity) {
  const colors = {
    'Common': '#a0a0a0',
    'Uncommon': '#4CAF50',
    'Rare': '#2196F3',
    'Epic': '#9C27B0',
    'Super-Epic': '#ff00ff',
    'Legendary': '#FFD700',
    'Mythical': '#FF0000',
    'Transcendent': '#ffffff'
  };
  return colors[rarity];
}
async function startTeamBattle() {
  const invalidTeams = teams.filter(team => team.fighters.length === 0);
  if (invalidTeams.length > 0) {
    alert('Each team must have at least one fighter!');
    return;
  }
  const teamWeapons = teams.map(team => {
    return team.fighters.map((_, i) => {
      const select = document.getElementById(`${team.id}${i + 1}`);
      return select ? select.value : null;
    });
  });
  if (teamWeapons.flat().some(w => !w)) {
    alert('Please select weapons for all fighters!');
    return;
  }
  document.getElementById('battleLoading').style.display = 'block';
  document.getElementById('winnerAnnouncement').style.display = 'none';
  const weapons = room.collection('weapons').getList();
  const teamFighters = teamWeapons.map(team => team.map(id => weapons.find(w => w.id === id)));
  const calcTeamPower = team => team.reduce((sum, w) => {
    const rarityValues = {
      'Common': 1,
      'Uncommon': 2,
      'Rare': 3,
      'Epic': 4,
      'Super-Epic': 5,
      'Legendary': 6,
      'Mythical': 7,
      'Transcendent': 8
    };
    return sum + rarityValues[w.rarity];
  }, 0);
  const teamPowers = teamFighters.map(calcTeamPower);
  const totalPower = teamPowers.reduce((a, b) => a + b, 0);
  const random = Math.random() * totalPower;
  let accumulator = 0;
  let winningTeamIndex = 0;
  for (let i = 0; i < teamPowers.length; i++) {
    accumulator += teamPowers[i];
    if (random <= accumulator) {
      winningTeamIndex = i;
      break;
    }
  }
  const location = document.getElementById('teamBattleLocation').value || 'Arena';
  const goreLevel = document.getElementById('goreIntensity').value;
  try {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Create an epic team battle scene in the ${location} between these ${teams.length} teams:
          
          Teams involved in this battle:
          ${teams.map(t => `- ${t.name}`).join('\n')}
          
          Detailed team compositions:
          ${teams.map((team, i) => {
            return `${team.name}:
              ${teamFighters[i].map((weapon, j) => `Fighter ${j + 1}: A warrior wielding ${JSON.stringify(weapon)}`).join('\n')}`;
          }).join('\n\n')}
          
          Gore Level: ${goreLevel}
          Gore Guidelines:
          - Tame: Blood, bruises and small cuts only
          - Violent: Deep cuts, massive bleeding, and bone breaks
          - Bloodbath: [Extremely graphic] Intense dismemberment, visceral gore, guttural screams, sadistic enjoyment, brutal psychological elements${goreLevel === 'Bloodbath' ? '. Make it extremely dark and disturbing, with vivid descriptions and dialogue showing the characters\' descent into madness' : ''}
          
          Generate a dramatic team battle with fighters wielding their assigned weapons.
          The battle can end in a decisive victory for any team, or a tie if all teams are equally matched.
          Include plenty of character dialogue to show their personalities and reactions.
          Consider each team's overall state at the end to determine the winner.
          All teams should be mentioned and involved in the battle.
          Use more line breaks between paragraphs and dialogue.
          
          You must assess who is in a better state at the end of the battle to determine the winner.
          A tie is only possible if all teams are in a nearly identical state.

          Respond directly with JSON, following this JSON schema, and no other text:
          {
            "battleDescription": "Multi-paragraph team battle description with dialogue", 
            "outcome": {
              "winningTeam": "${teams[winningTeamIndex].name}",
              "finalState": "Description of each team's condition at the end"
            }
          }`
        }
      ],
      json: true
    });

    const result = JSON.parse(completion.content);
    if (result.outcome.winningTeam === 'tie') {
      const finalStateDesc = result.outcome.finalState.toLowerCase();
      const teamStates = teams.map(t => {
        const mention = finalStateDesc.toLowerCase().indexOf(t.name.toLowerCase());
        const contextEnd = finalStateDesc.indexOf('.', mention);
        return {
          team: t,
          state: finalStateDesc.substring(mention, contextEnd)
        };
      });
      const hasSignificantDifference = teamStates.some(t => t.state.includes('slightly') || t.state.includes('somewhat') || t.state.includes('more injured'));
      if (hasSignificantDifference) {
        const bestTeam = teamStates.reduce((prev, curr) => {
          const prevBad = prev.state.includes('severely') || prev.state.includes('heavily');
          const currBad = curr.state.includes('severely') || curr.state.includes('heavily');
          return prevBad && !currBad ? curr : prev;
        });
        result.outcome.winningTeam = bestTeam.team.name;
      }
    }
    const winningTeamFighters = teamFighters[teams.findIndex(t => t.name === result.outcome.winningTeam)];
    if (result.outcome.winningTeam !== 'tie') {
      const battleDesc = document.querySelector('.team-mode-container .battle-description');
      if (!battleDesc) {
        const battleDescDiv = document.createElement('div');
        battleDescDiv.id = 'battleDescription';
        battleDescDiv.className = 'battle-description';
        document.querySelector('.team-mode-container').appendChild(battleDescDiv);
      }
      const battleDescUpdated = document.querySelector('.team-mode-container .battle-description');
      battleDescUpdated.innerHTML = result.battleDescription;
      const announcement = document.createElement('div');
      announcement.id = 'winnerAnnouncement';
      announcement.className = 'winner-announcement';
      document.querySelector('.team-mode-container').appendChild(announcement);
      const revealBtn = document.createElement('button');
      revealBtn.className = 'reveal-winner-btn';
      revealBtn.textContent = 'Reveal Winners';
      revealBtn.onclick = () => {
        announcement.style.display = 'block';
        announcement.innerHTML = `${result.outcome.winningTeam.toUpperCase()} is victorious with: ${winningTeamFighters.map(w => `<span style="color: var(--${w.rarity.toLowerCase()}-color)">${w.name}</span>`).join(' and ')}!<br><br><small>${result.outcome.finalState}</small>`;
        announcement.classList.add('revealed');
      };
      const publishBtn = document.createElement('button');
      publishBtn.textContent = 'Publish Battle Log';
      publishBtn.style.marginLeft = '10px';
      publishBtn.onclick = () => publishBattleLog(result.battleDescription, result.outcome.winningTeam, teams);
      battleDescUpdated.appendChild(revealBtn);
      battleDescUpdated.appendChild(publishBtn);
    }
  } catch (error) {
    console.error('Team battle generation error:', error);
    alert(error.message || 'Failed to generate team battle. Please try again.');
  } finally {
    document.getElementById('battleLoading').style.display = 'none';
  }
}
function colorize(text, weapons) {
  let colorized = text;
  weapons.forEach(weapon => {
    const regex = new RegExp(weapon.name, 'g');
    colorized = colorized.replace(regex, `<span class="element-${weapon.element}" style="color: var(--${weapon.rarity.toLowerCase()}-color)">${weapon.name}</span>`);
  });
  return colorized;
}
let teams = [{
  id: 'alpha',
  name: 'Alpha',
  fighters: [null, null, null],
  defaultWeapon: null
}, {
  id: 'omega',
  name: 'Omega',
  fighters: [null, null, null],
  defaultWeapon: null
}];
function setDefaultWeapon(teamId, weaponId) {
  const team = teams.find(t => t.id === teamId);
  if (team) {
    team.defaultWeapon = weaponId;
    team.fighters = team.fighters.map(() => weaponId);
    renderTeams();
  }
}
function createTeamElement(team, index, savedSelections) {
  const teamDiv = document.createElement('div');
  teamDiv.className = 'team-section';
  teamDiv.id = `team-${team.id}`;
  const savedTeam = savedSelections?.find(t => t.id === team.id);
  teamDiv.innerHTML = `
    <div class="default-weapon-container">
      <label class="battle-label">Default Weapon:</label>
      <select class="default-weapon-select" id="default-${team.id}" onchange="setDefaultWeapon('${team.id}', this.value)">
        <option value="">Select Default Weapon</option>
      </select>
    </div>
    <div class="team-name-container">
      <input type="text" 
        class="team-name-edit" 
        value="${team.name}"
        onchange="renameTeam('${team.id}', this.value)"
        placeholder="Team Name">
    </div>
    <div class="team-weapons">
      ${team.fighters.map((_, i) => `
        <div>
          <div class="input-group">
            <label class="battle-label">Fighter ${i + 1}:</label>
            <select id="${team.id}${i + 1}" 
              onchange="validateTeamWeaponSelection('${team.id}${i + 1}')"
              data-selected="${savedTeam?.weapons[i] || ''}">
              <option value="">Select a Weapon</option>
            </select>
            <button class="remove-fighter-btn" onclick="removeFighter('${team.id}', ${i})">×</button>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="add-fighter-btn" onclick="addFighter('${team.id}')">Add Fighter</button>
    ${index > 1 ? `<button class="remove-team-btn" onclick="removeTeam='${team.id}'">Remove Team</button>` : ''}
  `;
  return teamDiv;
}
function renderTeams() {
  const savedSelections = getTeamWeaponSelections();
  const container = document.getElementById('teamsContainer');
  container.innerHTML = '';
  teams.forEach((team, index) => {
    container.appendChild(createTeamElement(team, index, savedSelections));
  });
  updateTeamWeaponSelects();
  savedSelections.forEach(team => {
    team.weapons.forEach((weaponId, i) => {
      const select = document.getElementById(`${team.id}${i + 1}`);
      if (select && weaponId) {
        select.value = weaponId;
      }
    });
  });
}
function addTeam() {
  const id = `team${teams.length + 1}`;
  teams.push({
    id,
    name: `Team ${teams.length + 1}`,
    fighters: [null, null, null],
    defaultWeapon: null
  });
  renderTeams();
}
function removeTeam(teamId) {
  teams = teams.filter(team => team.id !== teamId);
  renderTeams();
}
function addFighter(teamId) {
  const team = teams.find(t => t.id === teamId);
  if (team) {
    team.fighters.push(team.defaultWeapon || null);
    renderTeams();
  }
}
function removeFighter(teamId, fighterIndex) {
  const team = teams.find(t => t.id === teamId);
  if (team && team.fighters.length > 1) {
    team.fighters.splice(fighterIndex, 1);
    renderTeams();
  }
}
function renameTeam(teamId, newName) {
  const team = teams.find(t => t.id === teamId);
  if (team) {
    team.name = newName.trim() || `Team ${teams.indexOf(team) + 1}`;
    renderTeams();
  }
}
function getTeamWeaponSelections() {
  return teams.map(team => ({
    id: team.id,
    name: team.name,
    weapons: team.fighters.map((_, i) => {
      const select = document.getElementById(`${team.id}${i + 1}`);
      return select ? select.value : null;
    })
  }));
}
async function sendMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (message) {
    try {
      await room.collection('chat').create({
        message: message,
        timestamp: new Date().toISOString()
      });
      input.value = '';
      lastReadMessageTime = new Date();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}
let lastReadMessageTime = new Date();
let chatVisible = false;
room.collection('chat').subscribe(messages => {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  const sortedMessages = messages.filter(msg => msg.message && msg.username).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  chatMessages.innerHTML = sortedMessages.map(msg => `
    <div class="chat-message">
      <span class="username">${msg.username}${msg.username === 'lak04171' ? '<span class="owner-badge">👑 Owner</span>' : ''}</span>
      <span class="message">${msg.message}</span>
      <span class="timestamp">${new Date(msg.created_at).toLocaleTimeString()}</span>
    </div>
  `).join('');
  chatMessages.scrollTop = chatMessages.scrollHeight;
  if (!chatVisible && messages.length > 0) {
    const latestMessage = sortedMessages[sortedMessages.length - 1];
    if (latestMessage && new Date(latestMessage.created_at) > lastReadMessageTime) {
      let notification = document.querySelector('.chat-notification');
      if (!notification) {
        notification = document.createElement('div');
        notification.className = 'chat-notification';
        document.querySelector('.chat-toggle').appendChild(notification);
      }
      notification.style.display = 'block';
    }
  }
});
document.getElementById('chatInput').addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});
async function deleteWeapon(weaponId) {
  if (confirm('Are you sure you want to delete this weapon?')) {
    try {
      await room.collection('weapons').delete(weaponId);
      document.getElementById('selectedWeapon').innerHTML = '';
    } catch (error) {
      console.error('Error deleting weapon:', error);
    }
  }
}
function getElementEmoji(element) {
  const elementMap = {
    'None': '',
    'Fire': '',
    'Ice': '',
    'Water': '',
    'Plant': '',
    'Electric': '',
    'Darkness': '',
    'Light': '',
    'Earth': '',
    'Wind': '',
    'Poison': '',
    'Cute': '',
    'Noble': '',
    'Undead': '',
    'Arcane': '',
    'Transformation': '',
    'Reality': '',
    'Spirit': '',
    'Inanimate': '',
    'Metal': '',
    'Animal': ''
  };
  const customElements = {};
  room.collection('elements').getList().forEach(elem => {
    customElements[elem.name] = elem.emoji;
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `.element-${elem.name} { color: ${elem.color}; }`;
    document.head.appendChild(styleSheet);
  });
  return customElements[element] || elementMap[element] || '';
}
let customElements = {};
let customFunctions = new Set();
async function addNewElement() {
  if (room.party.client.username !== 'lak04171') return;
  const name = document.getElementById('newElementName').value.trim();
  const color = document.getElementById('newElementColor').value.trim();
  const emoji = document.getElementById('newElementEmoji').value.trim();
  if (!name || !color || !emoji) {
    alert('Please fill in all element fields');
    return;
  }
  await room.collection('elements').create({
    name,
    color,
    emoji
  });
  document.getElementById('newElementName').value = '';
  document.getElementById('newElementColor').value = '';
  document.getElementById('newElementEmoji').value = '';
}
async function addNewFunction() {
  if (room.party.client.username !== 'lak04171') return;
  const name = document.getElementById('newFunctionName').value.trim();
  if (!name) {
    alert('Please enter a function name');
    return;
  }
  await room.collection('functions').create({
    name
  });
  document.getElementById('newFunctionName').value = '';
}
room.collection('elements').subscribe(elements => {
  elements.forEach(elem => {
    customElements[elem.name] = elem.emoji;
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `.element-${elem.name} { color: ${elem.color}; }`;
    document.head.appendChild(styleSheet);
  });
  updateElementSelects();
  const removeSelect = document.getElementById('elementToRemove');
  if (removeSelect) {
    removeSelect.innerHTML = '<option value="">Select Element to Remove</option>';
    elements.forEach(elem => {
      const option = document.createElement('option');
      option.value = elem.id;
      option.textContent = `${elem.emoji} ${elem.name}`;
      option.style.color = elem.color;
      removeSelect.appendChild(option);
    });
  }
});
room.collection('functions').subscribe(functions => {
  functions.forEach(func => {
    customFunctions.add(func.name);
  });
  updateFunctionSelects();
  const removeSelect = document.getElementById('functionToRemove');
  if (removeSelect) {
    removeSelect.innerHTML = '<option value="">Select Function to Remove</option>';
    functions.forEach(func => {
      const option = document.createElement('option');
      option.value = func.id;
      option.textContent = func.name;
      removeSelect.appendChild(option);
    });
  }
});
function updateElementSelects() {
  const elementSelects = [document.getElementById('weaponElement'), document.getElementById('optionalElement1'), document.getElementById('optionalElement2')];
  elementSelects.forEach(select => {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = select.id === 'weaponElement' ? 'Choose For Me' : 'Optional Element';
    select.appendChild(emptyOption);
    const standardElements = [{
      value: 'None',
      text: ' None',
      color: '#ffffff'
    }, {
      value: 'Fire',
      text: ' Fire',
      color: '#ff4444'
    }, {
      value: 'Ice',
      text: ' Ice',
      color: '#00ffff'
    }, {
      value: 'Water',
      text: ' Water',
      color: '#4444ff'
    }, {
      value: 'Plant',
      text: ' Plant',
      color: '#44ff44'
    }, {
      value: 'Electric',
      text: ' Electric',
      color: '#ffff44'
    }, {
      value: 'Darkness',
      text: ' Darkness',
      color: '#4b0082'
    }, {
      value: 'Light',
      text: ' Light',
      color: '#ffff80'
    }, {
      value: 'Earth',
      text: ' Earth',
      color: '#8b4513'
    }, {
      value: 'Wind',
      text: ' Wind',
      color: '#008080'
    }, {
      value: 'Poison',
      text: ' Poison',
      color: '#800080'
    }, {
      value: 'Cute',
      text: ' Cute',
      color: '#FFB6C1'
    }, {
      value: 'Noble',
      text: ' Noble',
      color: '#9370DB'
    }, {
      value: 'Undead',
      text: ' Undead',
      color: '#808000'
    }, {
      value: 'Arcane',
      text: ' Arcane',
      color: '#8B008B'
    }, {
      value: 'Transformation',
      text: ' Transformation',
      color: '#B8860B'
    }, {
      value: 'Reality',
      text: ' Reality',
      color: '#FF1493'
    }, {
      value: 'Spirit',
      text: ' Spirit',
      color: '#98FB98'
    }, {
      value: 'Inanimate',
      text: ' Inanimate',
      color: '#00008B'
    }, {
      value: 'Metal',
      text: ' Metal',
      color: '#4A4A4A'
    }, {
      value: 'Animal',
      text: ' Animal',
      color: '#654321'
    }];
    standardElements.forEach(elem => {
      const option = document.createElement('option');
      option.value = elem.value;
      option.style.color = elem.color;
      option.textContent = elem.text;
      select.appendChild(option);
    });
    room.collection('elements').getList().forEach(elem => {
      const option = document.createElement('option');
      option.value = elem.name;
      option.style.color = elem.color;
      option.textContent = `${elem.emoji} ${elem.name}`;
      select.appendChild(option);
    });
    if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
      select.value = currentValue;
    }
  });
}
function updateFunctionSelects() {
  const functionSelects = [document.getElementById('weaponType'), document.getElementById('optionalWeaponType1'), document.getElementById('optionalWeaponType2')];
  functionSelects.forEach(select => {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = select.id === 'weaponType' ? 'Generic' : 'Optional Function';
    select.appendChild(emptyOption);
    const standardFunctions = ['Melee', 'Ranged', 'Defense', 'Throwable', 'Area of Effect', 'Damage over Time', 'Magic', 'Summon Ally', 'Healing', 'Support', 'Debuff', 'Siege', 'Single Use', 'Ambush', 'Backfire', 'Charisma', 'Peaceful', 'Transformation', 'Mind Control', 'Time Manipulation'];
    standardFunctions.forEach(func => {
      const option = document.createElement('option');
      option.value = func;
      option.textContent = func;
      select.appendChild(option);
    });
    room.collection('functions').getList().forEach(func => {
      const option = document.createElement('option');
      option.value = func.name;
      option.textContent = func.name;
      select.appendChild(option);
    });
    if (currentValue && Array.from(select.options).some(opt => opt.value === currentValue)) {
      select.value = currentValue;
    }
  });
}
function showAdminButton() {
  const adminBtn = document.querySelector('.admin-mode-btn');
  const adminToggle = document.querySelector('.admin-toggle');
  room.party.subscribe(peers => {
    if (room.party.client.username === 'lak04171') {
      adminBtn.style.display = 'block';
      adminToggle.style.display = 'block';
    } else {
      adminBtn.style.display = 'none';
      if (document.querySelector('.input-section').style.display === 'grid') {
        switchMode('forge');
      }
    }
  });
}
function toggleChat() {
  const chatContainer = document.querySelector('.chat-container');
  const chatToggle = document.querySelector('.chat-toggle');
  chatContainer.classList.toggle('visible');
  const chatVisible = chatContainer.classList.contains('visible');
  chatToggle.textContent = chatVisible ? '×' : '';
  if (chatVisible) {
    const notification = document.querySelector('.chat-notification');
    if (notification) {
      notification.style.display = 'none';
    }
    const lastReadMessageTime = new Date();
  }
}
async function removeElement() {
  if (room.party.client.username !== 'lak04171') return;
  const elementSelect = document.getElementById('elementToRemove');
  const elementId = elementSelect.value;
  if (!elementId) {
    alert('Please select an element to remove');
    return;
  }
  try {
    await room.collection('elements').delete(elementId);
    elementSelect.value = '';
    alert('Element removed successfully');
  } catch (error) {
    console.error('Error removing element:', error);
    alert('Failed to remove element');
  }
}
async function submitSuggestion() {
  const input = document.getElementById('suggestionInput');
  const suggestion = input.value.trim();
  if (suggestion) {
    await room.collection('suggestions').create({
      text: suggestion,
      timestamp: new Date().toISOString()
    });
    input.value = '';
  }
}
async function removeFunction() {
  if (room.party.client.username !== 'lak04171') return;
  const functionSelect = document.getElementById('functionToRemove');
  const functionId = functionSelect.value;
  if (!functionId) {
    alert('Please select a function to remove');
    return;
  }
  try {
    await room.collection('functions').delete(functionId);
    functionSelect.value = '';
    alert('Function removed successfully');
  } catch (error) {
    console.error('Error removing function:', error);
    alert('Failed to remove function');
  }
}
function toggleAdminDropdown() {
  const dropdownContent = document.querySelector('.admin-dropdown-content');
  dropdownContent.classList.toggle('show');
  window.onclick = function (event) {
    if (!event.target.matches('.admin-toggle')) {
      const dropdowns = document.getElementsByClassName('admin-dropdown-content');
      for (let dropdown of dropdowns) {
        if (dropdown.classList.contains('show')) {
          dropdown.classList.remove('show');
        }
      }
    }
  };
}
showAdminButton();
function editWeapon(weaponId) {
  const weapons = room.collection('weapons').getList();
  const weapon = weapons.find(w => w.id === weaponId);
  if (!weapon) return;
  document.getElementById('weaponName').value = weapon.name;
  document.getElementById('weaponDescription').value = weapon.description || '';
  document.getElementById('weaponContext').value = weapon.context || '';
  document.getElementById('weaponType').value = weapon.type || 'Generic';
  document.getElementById('optionalWeaponType1').value = weapon.optionalType1 || '';
  document.getElementById('optionalWeaponType2').value = weapon.optionalType2 || '';
  document.getElementById('weaponElement').value = weapon.element || '';
  document.getElementById('optionalElement1').value = weapon.optionalElement1 || '';
  document.getElementById('optionalElement2').value = weapon.optionalElement2 || '';
  document.getElementById('weaponRarity').value = weapon.rarity || '';
  document.getElementById('weaponPrivacy').checked = weapon.isPrivate || false;
  if (!document.querySelector('.input-section').style.display === 'grid') {
    switchMode('forge');
  }
  document.querySelector('.input-section').scrollIntoView({
    behavior: 'smooth'
  });
}
room.collection('suggestions').subscribe(suggestions => {
  displaySuggestions(suggestions);
  suggestions.forEach(suggestion => {
    if (suggestion.tags) {
      const tags = [...suggestion.tags];
      room.collection('suggestions').subscribe(() => {
        const updatedSuggestion = room.collection('suggestions').getList().find(s => s.id === suggestion.id);
        if (updatedSuggestion && !arraysEqual(tags, updatedSuggestion.tags || [])) {
          displaySuggestions(room.collection('suggestions').getList());
        }
      });
    }
  });
});
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
async function addSuggestionTag(suggestionId, tag) {
  if (room.party.client.username !== 'lak04171') return;
  const suggestion = room.collection('suggestions').getList().find(s => s.id === suggestionId);
  if (!suggestion) return;
  const tags = suggestion.tags || [];
  if (!tags.includes(tag)) {
    tags.push(tag);
    await room.collection('suggestions').update(suggestionId, {
      tags
    });
    const suggestions = room.collection('suggestions').getList();
    displaySuggestions(suggestions);
  }
}
async function removeSuggestionTag(suggestionId, tag) {
  if (room.party.client.username !== 'lak04171') return;
  const suggestion = room.collection('suggestions').getList().find(s => s.id === suggestionId);
  if (!suggestion) return;
  const tags = suggestion.tags || [];
  const index = tags.indexOf(tag);
  if (index > -1) {
    tags.splice(index, 1);
    await room.collection('suggestions').update(suggestionId, {
      tags
    });
    const suggestions = room.collection('suggestions').getList();
    displaySuggestions(suggestions);
  }
}
function displaySuggestions(suggestions) {
  const suggestionsList = document.getElementById('suggestionsList');
  if (!suggestionsList) return;
  const likes = room.collection('suggestion-likes').getList();
  const comments = room.collection('suggestion-comments').getList();
  suggestions.sort((a, b) => {
    const aLikes = likes.filter(l => l.suggestionId === a.id).length;
    const bLikes = likes.filter(l => l.suggestionId === b.id).length;
    return bLikes - aLikes;
  });
  suggestionsList.innerHTML = suggestions.filter(suggestion => suggestion.text && suggestion.username).map(suggestion => {
    const suggestionLikes = likes.filter(l => l.suggestionId === suggestion.id);
    const suggestionComments = comments.filter(c => c.suggestionId === suggestion.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const hasLiked = suggestionLikes.some(l => l.username === room.party.client.username);
    return `
      <div class="suggestion-item">
        <p>${suggestion.text}</p>
        <div>
          ${(suggestion.tags || []).map(tag => `<span class="suggestion-tag tag-${tag}">
              ${tag}
              ${room.party.client.username === 'lak04171' ? `<span class="tag-remove" onclick="removeSuggestionTag('${suggestion.id}', '${tag}')">×</span>` : ''}
            </span>`).join('')}
        </div>
        ${room.party.client.username === 'lak04171' ? `
          <div class="suggestion-tag-buttons">
            <button class="suggestion-tag-button tag-Duplicate" onclick="addSuggestionTag('${suggestion.id}', 'Duplicate')">Duplicate</button>
            <button class="suggestion-tag-button tag-Accepted" onclick="addSuggestionTag('${suggestion.id}', 'Accepted')">Accepted</button>
            <button class="suggestion-tag-button tag-Declined" onclick="addSuggestionTag('${suggestion.id}', 'Declined')">Declined</button>
            <button class="suggestion-tag-button tag-BeingConsidered" onclick="addSuggestionTag('${suggestion.id}', 'BeingConsidered')">Being Considered</button>
          </div>
        ` : ''}
        <div class="suggestion-actions">
          <div class="suggestion-likes">
            <button class="like-btn" onclick="toggleLike('${suggestion.id}')">
              ${hasLiked ? '❤️' : '🤍'} 
              <span class="like-count">${suggestionLikes.length}</span>
            </button>
          </div>
        </div>
        <div class="suggestion-comments">
          <input type="text" 
            id="comment-${suggestion.id}" 
            class="comment-input" 
            placeholder="Add a comment..."
            onkeypress="if(event.key === 'Enter') addComment('${suggestion.id}')"
          >
          ${suggestionComments.map(comment => `
            <div class="comment">
              <span class="comment-username">${comment.username}</span>
              <span class="comment-timestamp">${new Date(comment.created_at).toLocaleString()}</span>
              <div class="comment-text">${comment.text}</div>
            </div>
          `).join('')}
        </div>
        <small>By ${suggestion.username} at ${new Date(suggestion.created_at).toLocaleString()}</small>
      </div>
    `;
  }).join('');
}
room.collection('suggestion-likes').subscribe(() => {
  const suggestions = room.collection('suggestions').getList();
  const suggestionsList = document.getElementById('suggestionsList');
  if (suggestionsList && suggestions.length) {
    const currentSuggestions = suggestions.map(s => ({
      ...s
    }));
    room.collection('suggestions').subscribe(() => {
      displaySuggestions(currentSuggestions);
    });
  }
});
room.collection('suggestion-comments').subscribe(() => {
  const suggestions = room.collection('suggestions').getList();
  const suggestionsList = document.getElementById('suggestionsList');
  if (suggestionsList && suggestions.length) {
    const currentSuggestions = suggestions.map(s => ({
      ...s
    }));
    room.collection('suggestions').subscribe(() => {
      displaySuggestions(currentSuggestions);
    });
  }
});
async function publishUpdate() {
  if (room.party.client.username !== 'lak04171') return;
  const formState = {
    weaponName: document.getElementById('weaponName').value,
    weaponDescription: document.getElementById('weaponDescription').value,
    weaponContext: document.getElementById('weaponContext').value,
    weaponType: document.getElementById('weaponType').value,
    optionalType1: document.getElementById('optionalWeaponType1').value,
    optionalType2: document.getElementById('optionalWeaponType2').value,
    weaponElement: document.getElementById('weaponElement').value,
    optionalElement1: document.getElementById('optionalElement1').value,
    optionalElement2: document.getElementById('optionalElement2').value,
    weaponRarity: document.getElementById('weaponRarity').value,
    weaponPrivacy: document.getElementById('weaponPrivacy').checked
  };
  localStorage.setItem('weaponForgeState', JSON.stringify(formState));
  await room.collection('updates').create({
    type: 'redirect',
    url: 'https://websim.ai/p/bwkafqvj9rnx8oeljz73',
    timestamp: new Date().toISOString()
  });
  window.location.href = 'https://websim.ai/p/bwkafqvj9rnx8oeljz73';
}
room.collection('updates').subscribe(updates => {
  const latestUpdate = updates[updates.length - 1];
  if (latestUpdate?.type === 'redirect' && latestUpdate.timestamp > localStorage.getItem('lastUpdateTimestamp')) {
    localStorage.setItem('lastUpdateTimestamp', latestUpdate.timestamp);
    const formState = {
      weaponName: document.getElementById('weaponName').value,
      weaponDescription: document.getElementById('weaponDescription').value,
      weaponContext: document.getElementById('weaponContext').value,
      weaponType: document.getElementById('weaponType').value,
      optionalType1: document.getElementById('optionalWeaponType1').value,
      optionalType2: document.getElementById('optionalWeaponType2').value,
      weaponElement: document.getElementById('weaponElement').value,
      optionalElement1: document.getElementById('optionalElement1').value,
      optionalElement2: document.getElementById('optionalElement2').value,
      weaponRarity: document.getElementById('weaponRarity').value,
      weaponPrivacy: document.getElementById('weaponPrivacy').checked
    };
    localStorage.setItem('weaponForgeState', JSON.stringify(formState));
    window.location.href = latestUpdate.url;
  }
});
async function publishBattleLog(battleDesc, winner, teams = null) {
  const location = teams ? document.getElementById('teamBattleLocation').value : document.getElementById('battleLocation').value;
  const goreLevel = document.getElementById('goreIntensity').value;
  
  const battleLog = {
    description: battleDesc,
    winner: winner,
    location: location || 'Arena',
    goreLevel,
    timestamp: new Date().toISOString(),
    isTeamBattle: !!teams,
    teams: teams
  };

  const weapons = room.collection('weapons').getList();
  
  if (teams) {
    const teamWeapons = teams.flatMap(team => 
      team.fighters.map(fighterId => weapons.find(w => w.id === fighterId))
    ).filter(w => w);
    
    for (const weapon of teamWeapons) {
      const battleLogs = weapon.battleLogs || [];
      await room.collection('weapons').update(weapon.id, {
        battleLogs: [...battleLogs, battleLog]
      });
    }
  } else {
    const weapon1 = weapons.find(w => w.id === document.getElementById('weapon1').value);
    const weapon2 = weapons.find(w => w.id === document.getElementById('weapon2').value);
    
    for (const weapon of [weapon1, weapon2]) {
      const battleLogs = weapon.battleLogs || [];
      await room.collection('weapons').update(weapon.id, {
        battleLogs: [...battleLogs, battleLog] 
      });
    }
  }

  await room.collection('battle-logs').create(battleLog);
}

function updateWeaponBattleLogs(weaponId) {
  const logContainer = document.querySelector(`.weapon-battle-logs[data-weapon-id="${weaponId}"] .battle-logs-list`);
  if (!logContainer) return;

  const weapon = room.collection('weapons').getList().find(w => w.id === weaponId);
  if (!weapon || !weapon.battleLogs) {
    logContainer.innerHTML = '<p>No battles recorded yet.</p>';
    return;
  }

  const logs = weapon.battleLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  logContainer.innerHTML = logs.map(log => `
    <div class="battle-log-item">
      <p>${log.isTeamBattle ? 'Team Battle' : 'Duel'} at ${log.location} (${log.goreLevel})</p>
      <p>Result: ${log.winner === weapon.name ? 'Victory' : 'Defeat'}</p>
      <div class="battle-description">${log.description}</div>
      <small>${new Date(log.timestamp).toLocaleString()}</small>
    </div>
  `).join('');
}

room.collection('weapons').subscribe(weapons => {
  displayWeapons(weapons);
  
  // Update battle logs for displayed weapon
  const selectedWeapon = document.getElementById('selectedWeapon');
  if (selectedWeapon && selectedWeapon.children.length) {
    const weaponCard = selectedWeapon.children[0];
    const weaponId = weaponCard.dataset.weaponId;
    if (weaponId) {
      updateWeaponBattleLogs(weaponId);
    }
  }
});
function summarizeBattleHistory(battleLogs) {
  if (!battleLogs || battleLogs.length === 0) {
    return "No previous battle experience";
  }

  const victories = battleLogs.filter(log => log.winner === battleLogs[0].weaponName).length;
  const winRate = Math.round((victories / battleLogs.length) * 100);
  
  return `${battleLogs.length} battles fought with a ${winRate}% win rate. Fighter has shown ${victories > battleLogs.length / 2 ? 'great prowess' : 'room for improvement'} in combat.`;
}
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('weaponSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const weapons = room.collection('weapons').getList();
      displayWeapons(weapons);
    });
  }
  const sortSelect = document.getElementById('sortBy');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      const weapons = room.collection('weapons').getList();
      displayWeapons(weapons);
    });
  }
});
async function addComment(suggestionId) {
  const input = document.getElementById(`comment-${suggestionId}`);
  const text = input.value.trim();
  if (text) {
    await room.collection('suggestion-comments').create({
      suggestionId,
      text,
      timestamp: new Date().toISOString()
    });
    input.value = '';
  }
}
async function toggleLike(suggestionId) {
  const existingLike = room.collection('suggestion-likes').getList().find(l => l.suggestionId === suggestionId && l.username === room.party.client.username);
  if (existingLike) {
    await room.collection('suggestion-likes').delete(existingLike.id);
  } else {
    await room.collection('suggestion-likes').create({
      suggestionId,
      timestamp: new Date().toISOString(),
      username: room.party.client.username
    });
  }
}
function updateMergeWeaponSelects() {
  const weapons = room.collection('weapons').getList();
  const visibleWeapons = weapons.filter(weapon => {
    return !weapon.isPrivate || weapon.creatorId === room.party.client.id;
  });
  const selects = [document.getElementById('mergeWeapon1'), document.getElementById('mergeWeapon2')];
  selects.forEach(select => {
    if (!select) return;
    select.value = '';
    select.innerHTML = '<option value="">Select a Weapon</option>';
    visibleWeapons.forEach(weapon => {
      const option = document.createElement('option');
      option.value = weapon.id;
      option.className = `rarity-${weapon.rarity}`;
      option.textContent = weapon.name;
      select.appendChild(option);
    });
  });
}
function validateMergeSelection() {
  const weapon1 = document.getElementById('mergeWeapon1').value;
  const weapon2 = document.getElementById('mergeWeapon2').value;
  if (weapon1 && weapon2 && weapon1 === weapon2) {
    alert('You cannot select the same weapon twice for merging!');
    document.getElementById('mergeWeapon2').value = '';
  }
}
function updateTeamWeaponSelects() {
  const weapons = room.collection('weapons').getList();
  const visibleWeapons = weapons.filter(weapon => {
    return !weapon.isPrivate || weapon.creatorId === room.party.client.id;
  });
  
  // Update duel mode selects
  const duelSelects = [document.getElementById('weapon1'), document.getElementById('weapon2')];
  duelSelects.forEach(select => {
    if (!select) return;
    select.value = '';
    select.innerHTML = '<option value="">Select a Weapon</option>';
    visibleWeapons.forEach(weapon => {
      const option = document.createElement('option');
      option.value = weapon.id;
      option.className = `rarity-${weapon.rarity}`;
      option.textContent = weapon.name;
      select.appendChild(option);
    });
  });

  // Update team mode selects 
  if (teams) {
    teams.forEach(team => {
      team.fighters.forEach((_, i) => {
        const select = document.getElementById(`${team.id}${i + 1}`);
        if (select) {
          select.value = '';
          select.innerHTML = '<option value="">Select a Weapon</option>';
          visibleWeapons.forEach(weapon => {
            const option = document.createElement('option');
            option.value = weapon.id;
            option.className = `rarity-${weapon.rarity}`;
            option.textContent = weapon.name;
            select.appendChild(option);
          });
        }
      });
    });
  }
}
function toggleBattleMode(mode) {
  const duelMode = document.getElementById('duelMode');
  const teamMode = document.getElementById('teamMode');
  const buttons = document.querySelectorAll('.battle-mode-btn');
  
  buttons.forEach(btn => btn.classList.remove('active'));
  
  if (mode === 'duel') {
    duelMode.style.display = 'block';
    teamMode.style.display = 'none';
    buttons[0].classList.add('active');
  } else {
    duelMode.style.display = 'none';
    teamMode.style.display = 'block';
    buttons[1].classList.add('active');
    renderTeams();
  }
}
let playerInventory = [];
let currentLocation = '';
let adventureState = {
  startTime: null,
  actionsPerformed: 0,
  battlesWon: 0,
  weaponsFound: 0,
  isEnded: false
};
async function mergeWeapons() {
  const weapon1Id = document.getElementById('mergeWeapon1').value;
  const weapon2Id = document.getElementById('mergeWeapon2').value;
  if (!weapon1Id || !weapon2Id) {
    alert('Please select two weapons to merge!');
    return;
  }
  const weapons = room.collection('weapons').getList();
  const weapon1 = weapons.find(w => w.id === weapon1Id);
  const weapon2 = weapons.find(w => w.id === weapon2Id);
  document.getElementById('loading').style.display = 'block';
  try {
    const completion = await websim.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Create a new weapon by merging these two weapons:
          
          Weapon 1: ${JSON.stringify(weapon1)}
          Weapon 2: ${JSON.stringify(weapon2)}
          
          Rules for merging:
          - Combine elements and functions in a creative way
          - New rarity should be one level higher than highest input rarity
          - Damage should be higher than either input weapon
          - Incorporate abilities from both weapons
          - Price should exceed both original weapons
          - Include a regular attack ability 
          
          Respond directly with JSON, following this JSON schema, and no other text:
          {
            "result": {
              "name": string,
              "damage": number,
              "element": string,
              "rarity": string,
              "specialAbility": string,
              "passiveEffects": string,
              "appearance": string,
              "price": number,
              "flavorBlurb": string
            }
          }`
        }
      ],
      json: true
    });

    const result = JSON.parse(completion.content);
    await room.collection('weapons').create({
      ...result.result,
      creatorId: room.party.client.id,
      isPrivate: false
    });
    const mergeResult = document.getElementById('mergeResult');
    const newWeaponCard = document.createElement('div');
    newWeaponCard.className = `weapon-card rarity-${result.result.rarity}`;
    newWeaponCard.innerHTML = createWeaponCard(result.result);
    mergeResult.innerHTML = '<h3>Merged Result:</h3>';
    mergeResult.appendChild(newWeaponCard);
    document.getElementById('mergeWeapon1').value = '';
    document.getElementById('mergeWeapon2').value = '';
  } catch (error) {
    console.error('Error merging weapons:', error);
    alert(error.message || 'Failed to merge weapons. Please try again.');
  } finally {
    document.getElementById('loading').style.display = 'none';
  }
}
room.collection('weapon-comments').subscribe(comments => {
  const weapons = room.collection('weapons').getList();
  const selectedWeapon = document.getElementById('selectedWeapon');
  if (selectedWeapon && selectedWeapon.children.length) {
    const weaponCard = selectedWeapon.children[0];
    const weaponId = weaponCard.dataset.weaponId;
    if (weaponId) {
      updateWeaponComments(weaponId, comments);
    }
  }
});
function updateWeaponComments(weaponId, comments) {
  const weaponComments = document.querySelector(`.weapon-comments[data-weapon-id="${weaponId}"]`);
  if (!weaponComments) return;
  const relevantComments = comments.filter(c => c.weaponId === weaponId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  weaponComments.innerHTML = `
    <input type="text"
      class="weapon-comment-input"
      placeholder="Add a comment..."
      onkeypress="if(event.key === 'Enter') addWeaponComment('${weaponId}')"
    >
    ${relevantComments.map(comment => `
      <div class="weapon-comment">
        <span class="weapon-comment-username">${comment.username}</span>
        <span class="weapon-comment-timestamp">${new Date(comment.created_at).toLocaleString()}</span>
        <div class="weapon-comment-text">${comment.text}</div>
      </div>
    `).join('')}
  `;
}
async function addWeaponComment(weaponId) {
  const input = document.querySelector(`.weapon-comments[data-weapon-id="${weaponId}"] .weapon-comment-input`);
  const text = input.value.trim();
  if (text) {
    await room.collection('weapon-comments').create({
      weaponId,
      text,
      timestamp: new Date().toISOString()
    });
    input.value = '';
  }
}
function updateWeaponSelects() {
  const weapons = room.collection('weapons').getList();
  const visibleWeapons = weapons.filter(weapon => {
    return !weapon.isPrivate || weapon.creatorId === room.party.client.id;
  });
  
  // Update duel mode selects
  const duelSelects = [document.getElementById('weapon1'), document.getElementById('weapon2')];
  duelSelects.forEach(select => {
    if (!select) return;
    select.value = '';
    select.innerHTML = '<option value="">Select a Weapon</option>';
    visibleWeapons.forEach(weapon => {
      const option = document.createElement('option');
      option.value = weapon.id;
      option.className = `rarity-${weapon.rarity}`;
      option.textContent = weapon.name;
      select.appendChild(option);
    });
  });

  // Update team mode selects 
  if (teams) {
    teams.forEach(team => {
      team.fighters.forEach((_, i) => {
        const select = document.getElementById(`${team.id}${i + 1}`);
        if (select) {
          select.value = '';
          select.innerHTML = '<option value="">Select a Weapon</option>';
          visibleWeapons.forEach(weapon => {
            const option = document.createElement('option');
            option.value = weapon.id;
            option.className = `rarity-${weapon.rarity}`;
            option.textContent = weapon.name;
            select.appendChild(option);
          });
        }
      });
    });
  }
}
function switchMode(mode) {
  const body = document.body;
  const inputSection = document.querySelector('.input-section');
  const battleSection = document.querySelector('.battle-section');
  const selectedWeapon = document.getElementById('selectedWeapon');
  const suggestionsBox = document.querySelector('.suggestions-box');
  const adminBox = document.querySelector('.admin-box');
  const battleLogsBox = document.querySelector('.battle-logs-box');
  body.classList.remove('arena-mode', 'suggestions-mode', 'admin-mode', 'battle-logs-mode', 'codes-mode', 'rpg-mode', 'rules-mode');
  inputSection.style.display = 'none';
  battleSection.style.display = 'none';
  selectedWeapon.style.display = 'none';
  suggestionsBox.style.display = 'none';
  adminBox.style.display = 'none';
  battleLogsBox.style.display = 'none';
  document.querySelector('.codes-box').style.display = 'none';
  document.querySelector('.rpg-box').style.display = 'none';
  document.querySelector('.merge-section').style.display = 'none';
  if (mode === 'forge') {
    document.getElementById('weaponPrivacy').checked = false;
    document.getElementById('weaponType').value = '';
    document.getElementById('optionalWeaponType1').value = '';
    document.getElementById('optionalWeaponType2').value = '';
    document.getElementById('weaponElement').value = '';
    document.getElementById('optionalElement1').value = '';
    document.getElementById('optionalElement2').value = '';
    document.getElementById('weaponRarity').value = '';
  }
  switch (mode) {
    case 'arena':
      body.classList.add('arena-mode');
      battleSection.style.display = 'block';
      updateWeaponSelects();
      break;
    case 'suggestions':
      body.classList.add('suggestions-mode');
      suggestionsBox.style.display = 'block';
      break;
    case 'admin':
      if (room.party.client.username !== 'lak04171') {
        return;
      }
      body.classList.add('admin-mode');
      adminBox.style.display = 'block';
      break;
    case 'battle-logs':
      body.classList.add('battle-logs-mode');
      battleLogsBox.style.display = 'block';
      break;
    case 'codes':
      body.classList.add('codes-mode');
      document.querySelector('.codes-box').style.display = 'block';
      break;
    case 'merge':
      document.querySelector('.merge-section').style.display = 'flex';
      document.getElementById('selectedWeapon').style.display = 'none';
      document.querySelector('.input-section').style.display = 'none';
      if (typeof updateMergeWeaponSelects === 'function') {
        updateMergeWeaponSelects();
      }
      break;
    case 'rpg':
      body.classList.add('rpg-mode');
      document.querySelector('.rpg-box').style.display = 'block';
      break;
    case 'rules':
      body.classList.add('rules-mode');
      document.querySelector('.rules-box').style.display = 'block';
      break;
    default:
      inputSection.style.display = 'grid';
      selectedWeapon.style.display = 'block';
      break;
  }
}
async function downloadWeapon(weaponId) {
  const weapons = room.collection('weapons').getList();
  const weapon = weapons.find(w => w.id === weaponId);
  if (!weapon) return;

  const weaponData = JSON.stringify(weapon, null, 2);
  const blob = new Blob([weaponData], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${weapon.name.replace(/[^a-z0-9]/gi, '_')}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

async function uploadWeapon(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const weaponData = JSON.parse(text);

    // Remove properties that should be generated by the server
    delete weaponData.id;
    delete weaponData.created_at;
    
    // Get privacy setting from checkbox
    const makePrivate = document.getElementById('uploadPrivacy').checked;
    
    // Create new weapon
    await room.collection('weapons').create({
      ...weaponData,
      creatorId: room.party.client.id,
      isPrivate: makePrivate
    });

    alert('Weapon uploaded successfully!');
  } catch (error) {
    console.error('Error uploading weapon:', error);
    alert('Error uploading weapon. Please make sure the file is properly formatted.');
  }
  
  // Reset file input
  event.target.value = '';
}

function viewWeaponStats(index) {
  const statsDiv = document.getElementById('selectedWeaponStats');
  const weapon = playerInventory[index];
  if (statsDiv.dataset.currentIndex === index.toString()) {
    statsDiv.classList.toggle('visible');
    statsDiv.dataset.currentIndex = statsDiv.classList.contains('visible') ? index : '';
    return;
  }
  if (!weapon) {
    statsDiv.classList.remove('visible');
    statsDiv.dataset.currentIndex = '';
    return;
  }
  let html = createWeaponCard(weapon, true);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const deleteBtn = tempDiv.querySelector('.delete-btn');
  if (deleteBtn) deleteBtn.remove();
  statsDiv.innerHTML = tempDiv.innerHTML;
  statsDiv.classList.add('visible');
  statsDiv.dataset.currentIndex = index;
}
async function startNewAdventure() {
  document.getElementById('adventureText').innerHTML = 'Starting adventure...';
  document.getElementById('customAction').disabled = false;
  document.getElementById('submitActionBtn').disabled = false;
  playerInventory = [];
  adventureState = {
    startTime: new Date().toISOString(),
    actionsPerformed: 0,
    battlesWon: 0,
    weaponsFound: 0,
    isEnded: false,
    difficultyMultiplier: 1.5
  };
  const startingWeaponChoice = document.getElementById('startingWeaponChoice').value;
  const specificWeaponSelect = document.getElementById('specificWeapon');
  const adventureLocation = document.getElementById('adventureLocation').value;
  specificWeaponSelect.style.display = startingWeaponChoice === 'choose' ? 'inline-block' : 'none';
  try {
    const weapons = room.collection('weapons').getList().filter(w => !w.isPrivate || w.creatorId === room.party.client.id);
    let startingWeapon;
    if (startingWeaponChoice === 'choose' && specificWeaponSelect.value) {
      startingWeapon = weapons.find(w => w.id === specificWeaponSelect.value);
    } else {
      const commonWeapons = weapons.filter(w => w.rarity === 'Common');
      const rareWeapons = weapons.filter(w => w.rarity !== 'Common');
      startingWeapon = Math.random() < 0.75 && commonWeapons.length > 0 ? commonWeapons[Math.floor(Math.random() * commonWeapons.length)] : rareWeapons[Math.floor(Math.random() * rareWeapons.length)];
    }
    const response = await websim.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Generate an initial scene for a text RPG adventure.
                  Player starts with: ${JSON.stringify(startingWeapon)}
                  ${adventureLocation ? `Location: ${adventureLocation}` : 'Generate an interesting location'}
                  Available weapons to potentially find: ${weapons.map(w => w.name).join(', ')}
                  
                  Create a rich opening scene that:
                  - Takes place in ${adventureLocation || 'a generated location'} 
                  - Balances danger with exploration and discovery
                  - Includes opportunities for peaceful interaction
                  - Creates interesting story hooks
                  - Gives clear environmental details
                  - Mixes combat with non-combat encounters 
                  - When player gathers/finds/picks up items, generate a relevant thematic weapon 
                  - If player finds an item that could be used as a weapon, create a weapon based on it
                  - If required weapon doesn't exist, generate stats for it including its regular attack
                  - Consider current location and inventory for item-based weapons
                  - Keep consistent with previous context
                  - Allow permanent death/failure
                  
                  Respond directly with JSON, following this JSON schema, and no other text:
                  {
                    "scene": {
                      "location": string,
                      "description": string
                    }
                  }`
        }
      ],
      json: true
    });

    const data = JSON.parse(response.content);
    if (startingWeapon) {
      playerInventory.push(startingWeapon);
    }
    currentLocation = adventureLocation || data.scene.location;
    document.getElementById('adventureText').innerHTML = data.scene.description;
    updateInventory();
  } catch (error) {
    console.error('Error starting adventure:', error);
    document.getElementById('adventureText').innerHTML = 'Error starting adventure. Please try again.';
  }
}
document.getElementById('startingWeaponChoice')?.addEventListener('change', e => {
  const specificWeaponSelect = document.getElementById('specificWeapon');
  specificWeaponSelect.style.display = e.target.value === 'choose' ? 'inline-block' : 'none';
  if (e.target.value === 'choose') {
    specificWeaponSelect.innerHTML = '<option value="">Select a Weapon</option>';
    const weapons = room.collection('weapons').getList();
    weapons.forEach(weapon => {
      const option = document.createElement('option');
      option.value = weapon.id;
      option.className = `rarity-${weapon.rarity}`;
      option.textContent = weapon.name;
      specificWeaponSelect.appendChild(option);
    });
  }
});
function updateInventory() {
  const inventoryDiv = document.getElementById('inventoryList');
  inventoryDiv.innerHTML = playerInventory.map((weapon, index) => `
    <div class="inventory-item weapon-list-item rarity-${weapon.rarity}" onclick="viewWeaponStats(${index})">
      ${weapon.name}
    </div>
  `).join('');
  document.getElementById('selectedWeaponStats').classList.remove('visible');
}
async function submitCustomAction() {
  const actionInput = document.getElementById('customAction');
  const submitBtn = document.getElementById('submitActionBtn');
  const processingDiv = document.getElementById('actionProcessing');
  const action = actionInput.value.trim();
  if (!action || adventureState.isEnded) return;
  actionInput.disabled = true;
  submitBtn.disabled = true;
  processingDiv.style.display = 'block';
  actionInput.value = '';
  try {
    const availableWeapons = room.collection('weapons').getList().filter(w => !w.isPrivate || w.creatorId === room.party.client.id);
    const response = await websim.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `Continue the RPG adventure based on player's custom action.
                  Current location: ${currentLocation}
                  Player inventory: ${playerInventory.map(w => w.name).join(', ')}
                  Player's action: "${action}"
                  Adventure state: ${JSON.stringify(adventureState)}
                  Difficulty multiplier: ${adventureState.difficultyMultiplier}
                  
                  Important guidelines:
                  - STRICTLY interpret and follow the player's exact action word for word if physically possible
                  - If the action is physically impossible, explain why and let the player try again
                  - Do not auto-complete or assume additional actions beyond what was typed
                  - Balance combat with exploration and interaction 
                  - Include peaceful solutions when possible
                  - Add descriptive breaks between intense moments
                  - Create meaningful non-combat encounters
                  - Mix puzzles and social interactions with combat
                  - When player gathers/finds/picks up items, generate a relevant thematic weapon 
                  - If player finds an item that could be used as a weapon, create a weapon based on it
                  - If required weapon doesn't exist, generate stats for it including its regular attack
                  - Consider current location and inventory for item-based weapons
                  - Keep consistent with previous context
                  - Allow permanent death/failure
                  
                  Respond directly with JSON, following this JSON schema, and no other text:
                  {
                    "scene": {
                      "location": string,
                      "description": string
                    },
                    "requiredWeaponName": null | string,
                    "newWeaponId": null | string, 
                    "weaponReason": null | string,
                    "actionOutcome": string,
                    "isValidAction": boolean,
                    "invalidReason"?: string,
                    "adventureEnded": boolean,
                    "endReason"?: string,
                    "generateWeaponFromItem"?: {
                      name: string,
                      description: string,
                      element: string,
                      rarity: string,
                      damage: number,
                      specialAbility: string,
                      passiveEffects?: string,
                      appearance: string,
                      price: number,
                      flavorBlurb: string
                    }
                  }`
        }
      ],
      json: true
    });

    const data = JSON.parse(response.content);
    if (!data.isValidAction) {
      document.getElementById('adventureText').innerHTML = `That action isn't possible here: ${data.invalidReason}\n\nCurrent situation:\n${data.scene.description}`;
      return;
    }
    currentLocation = data.scene.location;
    adventureState = {
      ...adventureState,
      lastAction: action,
      lastActionOutcome: data.actionOutcome,
      currentLocation: data.scene.location,
      actionsPerformed: adventureState.actionsPerformed + 1,
      isEnded: data.adventureEnded,
      difficultyMultiplier: Math.min(adventureState.difficultyMultiplier * 1.1, 3.0)
    };
    let output = `${data.actionOutcome}\n\n${data.scene.description}`;
    if (data.requiredWeaponName) {
      let newWeapon;
      const existingWeapon = availableWeapons.find(w => w.name === data.requiredWeaponName);
      if (existingWeapon) {
        newWeapon = existingWeapon;
      } else if (data.newWeaponId) {
        newWeapon = availableWeapons.find(w => w.id === data.newWeaponId);
      }
      if (newWeapon && data.weaponReason) {
        playerInventory.push(newWeapon);
        adventureState.weaponsFound++;
        output += `\n\nYou obtained ${newWeapon.name}! ${data.weaponReason}`;
        updateInventory();
      }
    }
    if (data.generateWeaponFromItem) {
      const weaponFromItem = data.generateWeaponFromItem;
      const newWeapon = await room.collection('weapons').create({
        ...weaponFromItem,
        creatorId: room.party.client.id,
        isPrivate: false
      });
      playerInventory.push(newWeapon);
      adventureState.weaponsFound++;
      output += `\n\nYou fashioned ${weaponFromItem.name} from your findings! ${weaponFromItem.flavorBlurb}`;
      updateInventory();
    }
    if (data.adventureEnded) {
      output += `\n\n<div class="adventure-ended">Adventure Ended: ${data.endReason}</div>`;
      actionInput.disabled = true;
      submitBtn.disabled = true;
    }
    document.getElementById('adventureText').innerHTML = output;
  } catch (error) {
    console.error('Error processing custom action:', error);
    document.getElementById('adventureText').innerHTML += '\n\nError processing your action. Please try again.';
  } finally {
    if (!adventureState.isEnded) {
      actionInput.disabled = false;
      submitBtn.disabled = false;
    }
    processingDiv.style.display = 'none';
    document.getElementById('selectedWeaponStats').classList.remove('visible');
  }
}
function updateMergeWeaponSelects() {
  const weapons = room.collection('weapons').getList();
  const visibleWeapons = weapons.filter(weapon => {
    return !weapon.isPrivate || weapon.creatorId === room.party.client.id;
  });
  const selects = [document.getElementById('mergeWeapon1'), document.getElementById('mergeWeapon2')];
  selects.forEach(select => {
    if (!select) return;
    select.value = '';
    select.innerHTML = '<option value="">Select a Weapon</option>';
    visibleWeapons.forEach(weapon => {
      const option = document.createElement('option');
      option.value = weapon.id;
      option.className = `rarity-${weapon.rarity}`;
      option.textContent = weapon.name;
      select.appendChild(option);
    });
  });
}
function validateMergeSelection() {
  const weapon1 = document.getElementById('mergeWeapon1').value;
  const weapon2 = document.getElementById('mergeWeapon2').value;
  if (weapon1 && weapon2 && weapon1 === weapon2) {
    alert('You cannot select the same weapon twice for merging!');
    document.getElementById('mergeWeapon2').value = '';
  }
}
async function submitCode() {
  const code = document.getElementById('codeInput').value.trim().toLowerCase();
  switch (code) {
    case 'emo':
      document.body.classList.remove('theme-cat', 'theme-nuclear', 'theme-blue', 'theme-deer');
      document.body.classList.add('theme-emo');
      document.querySelectorAll('*').forEach(el => {
        if (getComputedStyle(el).fontFamily.includes('PixelBody') || 
            getComputedStyle(el).fontFamily.includes('PixelTitle') || 
            getComputedStyle(el).fontFamily.includes('PixelBlurb') || 
            getComputedStyle(el).fontFamily.includes('CatPaw')) {
          el.style.fontFamily = "Viafont, monospace";
        }
      });
      break;
    case ':3':
      document.body.classList.remove('theme-emo', 'theme-nuclear', 'theme-blue', 'theme-deer');
      document.body.classList.add('theme-cat');
      document.querySelectorAll('*').forEach(el => {
        if (getComputedStyle(el).fontFamily.includes('PixelBody') || 
            getComputedStyle(el).fontFamily.includes('PixelTitle') || 
            getComputedStyle(el).fontFamily.includes('PixelBlurb') || 
            getComputedStyle(el).fontFamily.includes('Viafont')) {
          el.style.fontFamily = "CatPaw, sans-serif";
        }
      });
      break;
    case '0000-0000-0000-0000':
      document.body.classList.remove('theme-cat', 'theme-emo', 'theme-blue', 'theme-deer');
      document.body.classList.add('theme-nuclear');
      break;
    default:
      alert('Invalid code!');
  }
  document.getElementById('codeInput').value = '';
}

