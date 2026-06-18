import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useGame() {
  const temperature = ref(80)
  const heat = ref(50)
  const wood = ref(10)
  const food = ref(5)
  const hide = ref(0)
  const tools = ref(0)
  const isDay = ref(true)
  const dayCount = ref(1)
  const isBlizzard = ref(false)
  const gameOver = ref(false)
  const gameOverReason = ref('')
  const actionLog = ref([])

  const expedition = ref({
    status: 'idle',
    distance: 0,
    distanceName: '',
    distanceIndex: 0,
    progress: 0,
    daysRemaining: 0,
    totalDays: 0,
    supplies: {
      food: 0,
      wood: 0
    },
    equipment: {
      tools: 0,
      hide: 0
    },
    currentWeather: 'clear',
    loot: {
      food: 0,
      wood: 0,
      hide: 0,
      tools: 0
    },
    damageTaken: 0,
    returnDay: 0,
    log: []
  })

  const EXPEDITION_DISTANCES = [
    { name: '近郊探索', distance: 1, baseDays: 2, dailyFood: 1, dailyWood: 1, danger: 0.1, rewardMultiplier: 1, baseProgress: 1 },
    { name: '远郊跋涉', distance: 2, baseDays: 4, dailyFood: 1, dailyWood: 1, danger: 0.25, rewardMultiplier: 2, baseProgress: 0.5 },
    { name: '深山探险', distance: 3, baseDays: 6, dailyFood: 1, dailyWood: 2, danger: 0.4, rewardMultiplier: 3.5, baseProgress: 1 / 3 }
  ]

  const WEATHER_TYPES = [
    { name: '晴朗', type: 'clear', tempMod: 0, speedMod: 1, lootMod: 1.2, chance: 0.5 },
    { name: '小雪', type: 'light_snow', tempMod: -5, speedMod: 0.9, lootMod: 1, chance: 0.3 },
    { name: '大雪', type: 'heavy_snow', tempMod: -12, speedMod: 0.7, lootMod: 0.8, chance: 0.15 },
    { name: '暴风雪', type: 'blizzard', tempMod: -20, speedMod: 0.5, lootMod: 0.5, chance: 0.05 }
  ]

  const DAY_DURATION = 30000
  const NIGHT_DURATION = 20000
  const HEAT_CONSUMPTION_RATE = 2
  const BLIZZARD_CHANCE = 0.15

  let dayNightTimer = null
  let nightConsumptionTimer = null
  let autoSaveTimer = null

  const isNight = computed(() => !isDay.value)
  const isDanger = computed(() => temperature.value < 30)
  const canMakeFire = computed(() => wood.value >= 3)
  const canHunt = computed(() => tools.value > 0)
  const huntSuccessRate = computed(() => 0.3 + tools.value * 0.15)

  const isExpeditionActive = computed(() => expedition.value.status === 'exploring' || expedition.value.status === 'returning')
  const canStartExpedition = computed(() => {
    return expedition.value.status === 'idle' && isDay.value && !gameOver.value && food.value >= 2 && wood.value >= 1
  })

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    actionLog.value.unshift({ message, type, timestamp })
    if (actionLog.value.length > 20) {
      actionLog.value.pop()
    }
  }

  function checkGameOver() {
    if (temperature.value <= 20) {
      gameOver.value = true
      gameOverReason.value = '体温过低，你在严寒中失去了意识...'
      stopTimers()
      addLog('游戏结束：体温过低！', 'danger')
    }
    if (temperature.value >= 100) {
      temperature.value = 100
    }
  }

  function consumeHeat() {
    if (gameOver.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const consumption = HEAT_CONSUMPTION_RATE * multiplier
    
    if (heat.value >= consumption) {
      heat.value -= consumption
      if (temperature.value < 80) {
        temperature.value = Math.min(80, temperature.value + 1)
      }
    } else {
      heat.value = 0
      temperature.value = Math.max(0, temperature.value - consumption)
      addLog('热量不足！体温正在下降...', 'warning')
    }
    
    checkGameOver()
  }

  function startNightCycle() {
    addLog(`夜幕降临，第 ${dayCount.value} 天结束`, 'info')
    nightConsumptionTimer = setInterval(() => {
      consumeHeat()
    }, 1000)
    
    if (Math.random() < BLIZZARD_CHANCE) {
      triggerBlizzard()
    }
  }

  function startDayCycle() {
    dayCount.value++
    addLog(`天亮了，第 ${dayCount.value} 天开始`, 'success')
    isBlizzard.value = false
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    
    if (isExpeditionActive.value) {
      processExpeditionDay()
    }
  }

  function toggleDayNight() {
    isDay.value = !isDay.value
    if (isDay.value) {
      startDayCycle()
    } else {
      startNightCycle()
    }
  }

  function triggerBlizzard() {
    isBlizzard.value = true
    addLog('⚠️ 暴风雪来袭！所有消耗加倍！', 'danger')
  }

  function chopWood() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 5 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    const woodGained = Math.floor(Math.random() * 3) + 2
    wood.value += woodGained
    
    addLog(`砍柴：获得 ${woodGained} 木头，消耗 ${tempCost} 体温`, 'action')
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function hunt() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 8 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    if (Math.random() < huntSuccessRate.value) {
      const foodGained = Math.floor(Math.random() * 3) + 2
      const hideGained = Math.floor(Math.random() * 2) + 1
      food.value += foodGained
      hide.value += hideGained
      addLog(`狩猎成功：获得 ${foodGained} 食物，${hideGained} 兽皮，消耗 ${tempCost} 体温`, 'success')
    } else {
      addLog(`狩猎失败：消耗 ${tempCost} 体温，空手而归`, 'warning')
    }
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function makeTools() {
    if (gameOver.value || isNight.value) return
    if (wood.value < 2 || hide.value < 1) {
      addLog('材料不足：需要 2 木头和 1 兽皮', 'warning')
      return
    }
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 6 * multiplier
    
    wood.value -= 2
    hide.value -= 1
    tools.value += 1
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    addLog(`制作工具：获得 1 工具，消耗 ${tempCost} 体温`, 'success')
    checkGameOver()
  }

  function makeFire() {
    if (gameOver.value || !canMakeFire.value) {
      addLog('木头不足：生火需要 3 木头', 'warning')
      return
    }
    
    wood.value -= 3
    const heatGained = Math.floor(Math.random() * 20) + 25
    heat.value = Math.min(100, heat.value + heatGained)
    temperature.value = Math.min(100, temperature.value + 10)
    
    addLog(`生火：获得 ${heatGained} 热量，体温上升 10`, 'success')
  }

  function eatFood() {
    if (gameOver.value || food.value < 1) {
      addLog('没有食物了！', 'warning')
      return
    }
    
    food.value -= 1
    const tempGained = Math.floor(Math.random() * 10) + 5
    temperature.value = Math.min(100, temperature.value + tempGained)
    
    addLog(`进食：体温恢复 ${tempGained}`, 'success')
  }

  function startTimers() {
    dayNightTimer = setInterval(() => {
      toggleDayNight()
    }, isDay.value ? DAY_DURATION : NIGHT_DURATION)
    
    autoSaveTimer = setInterval(() => {
      saveGame('auto')
    }, 10000)
  }

  function stopTimers() {
    if (dayNightTimer) {
      clearInterval(dayNightTimer)
      dayNightTimer = null
    }
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
  }

  function saveGame(slot = 'manual') {
    const gameState = {
      temperature: temperature.value,
      heat: heat.value,
      wood: wood.value,
      food: food.value,
      hide: hide.value,
      tools: tools.value,
      isDay: isDay.value,
      dayCount: dayCount.value,
      isBlizzard: isBlizzard.value,
      expedition: JSON.parse(JSON.stringify(expedition.value)),
      savedAt: Date.now()
    }
    localStorage.setItem(`snowSurvival_${slot}`, JSON.stringify(gameState))
    addLog(`游戏已保存到存档位：${slot === 'auto' ? '自动存档' : slot}`, 'info')
  }

  function loadGame(slot = 'auto') {
    const saved = localStorage.getItem(`snowSurvival_${slot}`)
    if (!saved) {
      addLog('没有找到存档', 'warning')
      return false
    }
    
    try {
      const gameState = JSON.parse(saved)
      temperature.value = gameState.temperature
      heat.value = gameState.heat
      wood.value = gameState.wood
      food.value = gameState.food
      hide.value = gameState.hide
      tools.value = gameState.tools
      isDay.value = gameState.isDay
      dayCount.value = gameState.dayCount
      isBlizzard.value = gameState.isBlizzard
      gameOver.value = false
      gameOverReason.value = ''
      actionLog.value = []
      
      if (gameState.expedition) {
        expedition.value = gameState.expedition
      } else {
        resetExpedition()
      }
      
      stopTimers()
      startTimers()
      
      if (!isDay.value) {
        startNightCycle()
      }
      
      addLog(`成功加载存档：${slot === 'auto' ? '自动存档' : slot}`, 'success')
      return true
    } catch (e) {
      addLog('存档损坏，无法加载', 'danger')
      return false
    }
  }

  function getSaveSlots() {
    const slots = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('snowSurvival_')) {
        const slotName = key.replace('snowSurvival_', '')
        try {
          const data = JSON.parse(localStorage.getItem(key))
          slots.push({
            name: slotName,
            dayCount: data.dayCount,
            savedAt: data.savedAt
          })
        } catch (e) {}
      }
    }
    return slots
  }

  function deleteSave(slot) {
    localStorage.removeItem(`snowSurvival_${slot}`)
    addLog(`已删除存档：${slot}`, 'info')
  }

  function addExpeditionLog(message, type = 'info') {
    expedition.value.log.unshift({ message, type, day: dayCount.value })
    if (expedition.value.log.length > 30) {
      expedition.value.log.pop()
    }
  }

  function rollExpeditionWeather(distanceLevel) {
    const dangerBonus = distanceLevel * 0.05
    const roll = Math.random()
    let cumulative = 0
    
    for (const weather of WEATHER_TYPES) {
      let adjustedChance = weather.chance
      if (weather.type === 'blizzard' || weather.type === 'heavy_snow') {
        adjustedChance += dangerBonus
      }
      cumulative += adjustedChance
      if (roll < cumulative) {
        return weather
      }
    }
    return WEATHER_TYPES[0]
  }

  function startExpedition(distanceIndex, supplies, equipment) {
    if (!canStartExpedition.value) return false
    
    const distanceConfig = EXPEDITION_DISTANCES[distanceIndex]
    if (!distanceConfig) return false
    
    const minFood = distanceConfig.dailyFood * 2
    const minWood = distanceConfig.dailyWood * 2
    
    if (food.value < supplies.food || wood.value < supplies.wood) {
      addLog('补给不足，无法出发！', 'warning')
      return false
    }
    if (supplies.food < minFood || supplies.wood < minWood) {
      addLog(`补给不足！至少需要 ${minFood} 食物和 ${minWood} 木头`, 'warning')
      return false
    }
    if (tools.value < equipment.tools || hide.value < equipment.hide) {
      addLog('装备不足！', 'warning')
      return false
    }
    
    food.value -= supplies.food
    wood.value -= supplies.wood
    tools.value -= equipment.tools
    hide.value -= equipment.hide
    
    const initialWeather = rollExpeditionWeather(distanceConfig.distance)
    
    expedition.value = {
      status: 'exploring',
      distance: distanceConfig.distance,
      distanceName: distanceConfig.name,
      distanceIndex,
      progress: 0,
      elapsedDays: 0,
      supplies: { ...supplies },
      equipment: { ...equipment },
      currentWeather: initialWeather.type,
      loot: { food: 0, wood: 0, hide: 0, tools: 0 },
      damageTaken: 0,
      log: [],
      dailyFood: distanceConfig.dailyFood,
      dailyWood: distanceConfig.dailyWood,
      baseProgressPerDay: distanceConfig.baseProgress
    }
    
    addLog(`🏕️ 探险队出发！目标：${distanceConfig.name}`, 'success')
    addExpeditionLog(`探险队出发，目的地：${distanceConfig.name}`, 'info')
    addExpeditionLog(`携带补给：🍖${supplies.food} 🪵${supplies.wood} 🔧${equipment.tools} 🦊${equipment.hide}`, 'info')
    addExpeditionLog(`每日消耗：🍖${distanceConfig.dailyFood} 🪵${distanceConfig.dailyWood}`, 'info')
    addExpeditionLog(`初始天气：${initialWeather.name}`, initialWeather.type === 'blizzard' ? 'danger' : 'info')
    
    return true
  }

  function calculateDailyProgress(exp, weather) {
    const toolBonus = exp.equipment.tools * 0.15
    const speedMultiplier = weather.speedMod * (1 + toolBonus * 0.3)
    return exp.baseProgressPerDay * speedMultiplier
  }

  function calculateEstimatedDaysRemaining(exp, weather) {
    const dailyProgress = calculateDailyProgress(exp, weather)
    let remainingProgress
    if (exp.status === 'exploring') {
      remainingProgress = 2 - exp.progress
    } else {
      remainingProgress = 2 - exp.progress
    }
    if (dailyProgress <= 0) return 999
    return Math.ceil(remainingProgress / dailyProgress)
  }

  function processExpeditionDay() {
    if (!isExpeditionActive.value) return
    
    const exp = expedition.value
    const distanceConfig = EXPEDITION_DISTANCES[exp.distanceIndex]
    const weather = WEATHER_TYPES.find(w => w.type === exp.currentWeather) || WEATHER_TYPES[0]
    
    const toolBonus = exp.equipment.tools * 0.15
    const hideProtection = exp.equipment.hide * 0.1
    
    const dailyFoodConsume = exp.dailyFood
    const dailyWoodConsume = exp.dailyWood
    
    const daySummary = {
      foodConsumed: 0,
      woodConsumed: 0,
      hungerDamage: 0,
      tempDamage: 0,
      eventDamage: 0,
      loot: { food: 0, wood: 0, hide: 0, tools: 0 },
      progressGain: 0,
      weatherChanged: false,
      newWeather: null,
      reachedDestination: false,
      returned: false
    }
    
    if (exp.supplies.food >= dailyFoodConsume) {
      exp.supplies.food -= dailyFoodConsume
      daySummary.foodConsumed = dailyFoodConsume
    } else {
      daySummary.foodConsumed = exp.supplies.food
      exp.supplies.food = 0
      daySummary.hungerDamage = 5
    }
    
    let heatFromFire = 0
    if (exp.supplies.wood >= dailyWoodConsume) {
      exp.supplies.wood -= dailyWoodConsume
      daySummary.woodConsumed = dailyWoodConsume
      heatFromFire = 8
    } else {
      daySummary.woodConsumed = exp.supplies.wood
      exp.supplies.wood = 0
    }
    
    const baseTempDamage = Math.abs(weather.tempMod) * 0.3
    const tempDamage = Math.max(0, Math.round((baseTempDamage * (1 - hideProtection) - heatFromFire * 0.5) * 10) / 10)
    daySummary.tempDamage = tempDamage
    
    const isReturning = exp.status === 'returning'
    const progressGain = calculateDailyProgress(exp, weather)
    daySummary.progressGain = progressGain
    
    if (!isReturning) {
      const oldProgress = exp.progress
      exp.progress = Math.min(1, exp.progress + progressGain)
      
      const baseLoot = 1 + Math.random() * 2
      const lootAmount = Math.floor(baseLoot * distanceConfig.rewardMultiplier * weather.lootMod * (1 + toolBonus))
      
      const lootRoll = Math.random()
      if (lootRoll < 0.4) {
        exp.loot.food += lootAmount
        daySummary.loot.food = lootAmount
      } else if (lootRoll < 0.7) {
        exp.loot.wood += lootAmount
        daySummary.loot.wood = lootAmount
      } else if (lootRoll < 0.9) {
        const hideLoot = Math.ceil(lootAmount * 0.5)
        exp.loot.hide += hideLoot
        daySummary.loot.hide = hideLoot
      } else if (lootRoll < 0.95 && exp.equipment.tools > 0) {
        exp.loot.tools += 1
        daySummary.loot.tools = 1
      }
      
      if (Math.random() < distanceConfig.danger) {
        const eventDamage = 5 + Math.floor(Math.random() * 10)
        const reducedDamage = Math.ceil(eventDamage * (1 - hideProtection))
        daySummary.eventDamage = reducedDamage
      }
      
      if (oldProgress < 1 && exp.progress >= 1) {
        exp.status = 'returning'
        daySummary.reachedDestination = true
      }
    } else {
      exp.progress = Math.min(2, exp.progress + progressGain)
      
      if (exp.progress >= 2) {
        daySummary.returned = true
      }
    }
    
    const totalDamage = daySummary.hungerDamage + daySummary.tempDamage + daySummary.eventDamage
    if (totalDamage > 0) {
      exp.damageTaken += totalDamage
      temperature.value = Math.max(0, temperature.value - totalDamage)
    }
    
    const newWeather = rollExpeditionWeather(distanceConfig.distance)
    if (newWeather.type !== exp.currentWeather) {
      exp.currentWeather = newWeather.type
      daySummary.weatherChanged = true
      daySummary.newWeather = newWeather
    }
    
    exp.elapsedDays++
    
    logExpeditionDaySummary(exp, daySummary, weather)
    
    if (daySummary.returned) {
      completeExpedition()
      return
    }
    
    checkGameOver()
  }

  function logExpeditionDaySummary(exp, summary, weather) {
    const dayNum = exp.elapsedDays
    
    addExpeditionLog(`--- 第 ${dayNum} 天 (${weather.name}) ---`, 'info')
    
    if (summary.foodConsumed > 0) {
      addExpeditionLog(`🍖 消耗食物 ${summary.foodConsumed}，剩余 ${exp.supplies.food}`, 'info')
    }
    if (summary.hungerDamage > 0) {
      addExpeditionLog(`⚠️ 食物耗尽！饥饿伤害 -${summary.hungerDamage}`, 'danger')
    }
    
    if (summary.woodConsumed > 0) {
      addExpeditionLog(`🪵 消耗木柴 ${summary.woodConsumed}，剩余 ${exp.supplies.wood}`, 'info')
    }
    if (summary.woodConsumed === 0 && exp.dailyWood > 0 && exp.supplies.wood === 0) {
      addExpeditionLog(`🪵 木柴耗尽，无法生火取暖`, 'warning')
    }
    
    if (summary.tempDamage > 0) {
      addExpeditionLog(`❄️ 低温伤害 -${summary.tempDamage}`, 'warning')
    }
    
    if (summary.eventDamage > 0) {
      addExpeditionLog(`💥 遭遇意外！伤害 -${summary.eventDamage}`, 'danger')
    }
    
    if (summary.loot.food > 0) {
      addExpeditionLog(`🍖 发现食物 +${summary.loot.food}`, 'success')
    }
    if (summary.loot.wood > 0) {
      addExpeditionLog(`🪵 收集木材 +${summary.loot.wood}`, 'success')
    }
    if (summary.loot.hide > 0) {
      addExpeditionLog(`🦊 发现兽皮 +${summary.loot.hide}`, 'success')
    }
    if (summary.loot.tools > 0) {
      addExpeditionLog(`🔧 发现工具 +${summary.loot.tools}`, 'success')
    }
    
    if (summary.reachedDestination) {
      addExpeditionLog(`📍 到达目的地！开始返程`, 'success')
      addLog(`🏔️ 探险队到达${exp.distanceName}，开始返程`, 'info')
    }
    
    if (summary.weatherChanged && summary.newWeather) {
      addExpeditionLog(`🌤️ 天气变为：${summary.newWeather.name}`, summary.newWeather.type === 'blizzard' ? 'danger' : 'info')
    }
    
    const progressPercent = Math.round((exp.progress / 2) * 100)
    const statusText = exp.status === 'exploring' ? '前往中' : '返程中'
    addExpeditionLog(`进度：${progressPercent}% (${statusText})`, 'info')
  }

  function completeExpedition() {
    const exp = expedition.value
    
    food.value += exp.loot.food + exp.supplies.food
    wood.value += exp.loot.wood + exp.supplies.wood
    hide.value += exp.loot.hide + exp.equipment.hide
    tools.value += exp.loot.tools + exp.equipment.tools
    
    expedition.value.status = 'completed'
    
    addLog(`🎉 探险队安全归来！`, 'success')
    addExpeditionLog(`🎉 安全返回营地！`, 'success')
    
    addLog(`收获：🍖${exp.loot.food} 🪵${exp.loot.wood} 🦊${exp.loot.hide} 🔧${exp.loot.tools}`, 'success')
    addLog(`归还装备：🔧${exp.equipment.tools} 🦊${exp.equipment.hide}`, 'info')
    if (exp.supplies.food > 0 || exp.supplies.wood > 0) {
      addLog(`剩余补给：🍖${exp.supplies.food} 🪵${exp.supplies.wood}`, 'info')
    }
    if (exp.damageTaken > 0) {
      addLog(`探险中总计承受 ${Math.round(exp.damageTaken)} 点伤害`, 'warning')
    }
    addLog(`探险历时 ${exp.elapsedDays} 天`, 'info')
    
    setTimeout(() => {
      resetExpedition()
    }, 5000)
  }

  function resetExpedition() {
    expedition.value = {
      status: 'idle',
      distance: 0,
      distanceName: '',
      distanceIndex: 0,
      progress: 0,
      elapsedDays: 0,
      supplies: { food: 0, wood: 0 },
      equipment: { tools: 0, hide: 0 },
      currentWeather: 'clear',
      loot: { food: 0, wood: 0, hide: 0, tools: 0 },
      damageTaken: 0,
      log: [],
      dailyFood: 0,
      dailyWood: 0,
      baseProgressPerDay: 0
    }
  }

  function getExpeditionSupplyRequirement(distanceIndex) {
    const config = EXPEDITION_DISTANCES[distanceIndex]
    if (!config) return null
    const minFood = config.dailyFood * 2
    const minWood = config.dailyWood * 2
    return {
      minFood,
      minWood,
      recommendedFood: Math.ceil(config.dailyFood * config.baseDays * 1.2),
      recommendedWood: Math.ceil(config.dailyWood * config.baseDays * 1.2),
      dailyFood: config.dailyFood,
      dailyWood: config.dailyWood,
      baseDays: config.baseDays
    }
  }

  function restartGame() {
    temperature.value = 80
    heat.value = 50
    wood.value = 10
    food.value = 5
    hide.value = 0
    tools.value = 0
    isDay.value = true
    dayCount.value = 1
    isBlizzard.value = false
    gameOver.value = false
    gameOverReason.value = ''
    actionLog.value = []
    resetExpedition()
    
    stopTimers()
    startTimers()
    
    addLog('新游戏开始！祝你好运！', 'success')
  }

  onMounted(() => {
    startTimers()
    addLog('欢迎来到雪地生存！白天收集资源，夜晚保持温暖。', 'info')
  })

  onUnmounted(() => {
    stopTimers()
  })

  return {
    temperature,
    heat,
    wood,
    food,
    hide,
    tools,
    isDay,
    isNight,
    dayCount,
    isBlizzard,
    gameOver,
    gameOverReason,
    actionLog,
    isDanger,
    canMakeFire,
    canHunt,
    huntSuccessRate,
    chopWood,
    hunt,
    makeTools,
    makeFire,
    eatFood,
    saveGame,
    loadGame,
    getSaveSlots,
    deleteSave,
    restartGame,
    expedition,
    EXPEDITION_DISTANCES,
    WEATHER_TYPES,
    isExpeditionActive,
    canStartExpedition,
    startExpedition,
    getExpeditionSupplyRequirement,
    calculateDailyProgress,
    calculateEstimatedDaysRemaining
  }
}
