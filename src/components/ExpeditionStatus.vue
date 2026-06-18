<template>
  <div class="expedition-status" :class="weatherClass">
    <h3 class="panel-title">🏔️ 远行探险中</h3>
    
    <div class="destination-info">
      <span class="dest-name">{{ expedition.distanceName }}</span>
      <span class="status-badge" :class="statusClass">
        {{ statusText }}
      </span>
    </div>

    <div class="progress-section">
      <div class="progress-header">
        <span>探险进度</span>
        <span class="eta-text" :class="{ etaWarning: estimatedDays > 5 }">
          预计 {{ estimatedDays }} 天后返回
        </span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
          <div class="progress-marker" :style="{ left: '50%' }"></div>
        </div>
        <div class="progress-labels">
          <span>营地</span>
          <span>目的地</span>
          <span>营地</span>
        </div>
      </div>
      <div class="progress-detail">
        <span>已行进 {{ expedition.elapsedDays }} 天</span>
        <span>总进度 {{ progressPercent }}%</span>
      </div>
    </div>

    <div class="weather-section">
      <div class="weather-icon">{{ weatherIcon }}</div>
      <div class="weather-info">
        <div class="weather-name">{{ weatherData.name }}</div>
        <div class="weather-effects">
          <span v-if="weatherData.tempMod < 0" class="effect bad">
            体温 {{ weatherData.tempMod }}
          </span>
          <span v-if="weatherData.speedMod < 1" class="effect bad">
            速度 {{ Math.round(weatherData.speedMod * 100) }}%
          </span>
          <span v-if="weatherData.lootMod > 1" class="effect good">
            收获 +{{ Math.round((weatherData.lootMod - 1) * 100) }}%
          </span>
          <span v-if="weatherData.lootMod < 1" class="effect bad">
            收获 {{ Math.round(weatherData.lootMod * 100) }}%
          </span>
        </div>
      </div>
    </div>

    <div class="supplies-section">
      <div class="section-title">
        <span>剩余补给</span>
        <span class="daily-rate">每日消耗: 🍖{{ expedition.dailyFood }} 🪵{{ expedition.dailyWood }}</span>
      </div>
      <div class="supplies-grid">
        <div class="supply-item" :class="{ low: foodDays < 2 && foodDays > 0, empty: foodDays <= 0 }">
          <span class="supply-icon">🍖</span>
          <div class="supply-info">
            <span class="supply-amount">{{ expedition.supplies.food }}</span>
            <span class="supply-days">
              {{ foodDays > 0 ? `还能撑${foodDays}天` : '已耗尽' }}
            </span>
          </div>
        </div>
        <div class="supply-item" :class="{ low: woodDays < 2 && woodDays > 0, empty: woodDays <= 0 }">
          <span class="supply-icon">🪵</span>
          <div class="supply-info">
            <span class="supply-amount">{{ expedition.supplies.wood }}</span>
            <span class="supply-days">
              {{ woodDays > 0 ? `还能撑${woodDays}天` : '已耗尽' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="loot-section">
      <div class="section-title">已收集</div>
      <div class="loot-grid">
        <div class="loot-item">
          <span class="loot-icon">🍖</span>
          <span class="loot-amount">{{ expedition.loot.food }}</span>
        </div>
        <div class="loot-item">
          <span class="loot-icon">🪵</span>
          <span class="loot-amount">{{ expedition.loot.wood }}</span>
        </div>
        <div class="loot-item">
          <span class="loot-icon">🦊</span>
          <span class="loot-amount">{{ expedition.loot.hide }}</span>
        </div>
        <div class="loot-item">
          <span class="loot-icon">🔧</span>
          <span class="loot-amount">{{ expedition.loot.tools }}</span>
        </div>
      </div>
    </div>

    <div class="damage-section">
      <span class="damage-label">累计伤害</span>
      <span class="damage-value" :class="{ danger: expedition.damageTaken > 20 }">
        {{ Math.round(expedition.damageTaken) }}
      </span>
    </div>

    <div class="log-section">
      <div class="section-title">探险日志</div>
      <div class="log-list">
        <div 
          v-for="(log, index) in expedition.log.slice(0, 8)" 
          :key="index"
          class="log-item"
          :class="log.type"
        >
          <span class="log-day">第{{ log.day }}天</span>
          <span class="log-text">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  expedition: { type: Object, required: true },
  weatherTypes: { type: Array, required: true },
  calcEstimatedDays: { type: Function, required: true }
})

const weatherData = computed(() => {
  return props.weatherTypes.find(w => w.type === props.expedition.currentWeather) || props.weatherTypes[0]
})

const weatherIcon = computed(() => {
  const weather = props.expedition.currentWeather
  switch (weather) {
    case 'clear': return '☀️'
    case 'light_snow': return '🌨️'
    case 'heavy_snow': return '❄️'
    case 'blizzard': return '🌪️'
    default: return '☀️'
  }
})

const weatherClass = computed(() => {
  return `weather-${props.expedition.currentWeather}`
})

const statusText = computed(() => {
  if (props.expedition.status === 'exploring') return '前往中'
  if (props.expedition.status === 'returning') return '返程中'
  if (props.expedition.status === 'completed') return '已归来'
  return '未知'
})

const statusClass = computed(() => {
  if (props.expedition.status === 'exploring') return 'exploring'
  if (props.expedition.status === 'returning') return 'returning'
  if (props.expedition.status === 'completed') return 'completed'
  return ''
})

const progressPercent = computed(() => {
  return Math.round((props.expedition.progress / 2) * 100)
})

const estimatedDays = computed(() => {
  if (props.expedition.status === 'completed') return 0
  return props.calcEstimatedDays(props.expedition, weatherData.value)
})

const foodDays = computed(() => {
  if (props.expedition.dailyFood <= 0) return 99
  return Math.floor(props.expedition.supplies.food / props.expedition.dailyFood)
})

const woodDays = computed(() => {
  if (props.expedition.dailyWood <= 0) return 99
  return Math.floor(props.expedition.supplies.wood / props.expedition.dailyWood)
})
</script>

<style scoped>
.expedition-status {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.weather-clear {
  background: linear-gradient(135deg, rgba(135, 206, 235, 0.3), rgba(255, 255, 255, 0.1));
}

.weather-light_snow {
  background: linear-gradient(135deg, rgba(176, 196, 222, 0.3), rgba(255, 255, 255, 0.1));
}

.weather-heavy_snow {
  background: linear-gradient(135deg, rgba(100, 120, 150, 0.4), rgba(255, 255, 255, 0.1));
}

.weather-blizzard {
  background: linear-gradient(135deg, rgba(80, 80, 100, 0.5), rgba(255, 255, 255, 0.05));
  animation: blizzardPulse 2s ease-in-out infinite;
}

@keyframes blizzardPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

.panel-title {
  color: white;
  font-size: 18px;
  margin-bottom: 15px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.destination-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.dest-name {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.exploring {
  background: rgba(74, 222, 128, 0.3);
  color: #4ade80;
}

.status-badge.returning {
  background: rgba(96, 165, 250, 0.3);
  color: #60a5fa;
}

.status-badge.completed {
  background: rgba(251, 191, 36, 0.3);
  color: #fbbf24;
}

.progress-section {
  margin-bottom: 15px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  margin-bottom: 8px;
}

.eta-text {
  color: #60a5fa;
  font-weight: bold;
}

.eta-text.etaWarning {
  color: #fbbf24;
}

.progress-detail {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.progress-bar-container {
  position: relative;
}

.progress-bar {
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22c55e, #60a5fa);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.progress-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.5);
  transform: translateX(-50%);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
}

.weather-section {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 15px;
}

.weather-icon {
  font-size: 36px;
}

.weather-info {
  flex: 1;
}

.weather-name {
  color: white;
  font-size: 15px;
  font-weight: bold;
  margin-bottom: 4px;
}

.weather-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.effect {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.effect.good {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.effect.bad {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.section-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.daily-rate {
  font-size: 10px;
  font-weight: normal;
  color: rgba(255, 255, 255, 0.6);
}

.supplies-section,
.loot-section,
.damage-section {
  margin-bottom: 15px;
}

.supplies-grid,
.loot-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.supply-item,
.loot-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  transition: all 0.3s ease;
}

.supply-item.low {
  background: rgba(251, 191, 36, 0.2);
  border: 1px solid rgba(251, 191, 36, 0.4);
}

.supply-item.empty {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  animation: emptyPulse 2s ease-in-out infinite;
}

@keyframes emptyPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.supply-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.supply-icon,
.loot-icon {
  font-size: 20px;
}

.supply-amount,
.loot-amount {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.supply-days {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

.supply-item.low .supply-days {
  color: #fbbf24;
}

.supply-item.empty .supply-days {
  color: #f87171;
}

.damage-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  padding: 10px 15px;
}

.damage-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.damage-value {
  color: #fbbf24;
  font-size: 18px;
  font-weight: bold;
}

.damage-value.danger {
  color: #ef4444;
  animation: damagePulse 1s ease-in-out infinite;
}

@keyframes damagePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.log-section {
  max-height: 180px;
  overflow-y: auto;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}

.log-day {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.log-text {
  color: rgba(255, 255, 255, 0.9);
}

.log-item.success .log-text {
  color: #4ade80;
}

.log-item.warning .log-text {
  color: #fbbf24;
}

.log-item.danger .log-text {
  color: #f87171;
}

.log-section::-webkit-scrollbar {
  width: 6px;
}

.log-section::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.log-section::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}
</style>
