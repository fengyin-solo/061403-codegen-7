<template>
  <div class="expedition-prep">
    <h3 class="panel-title">🏕️ 远行探险</h3>
    
    <div class="distance-selector">
      <div class="selector-label">选择目的地：</div>
      <div class="distance-options">
        <button 
          v-for="(dist, index) in distances" 
          :key="index"
          class="distance-btn"
          :class="{ active: selectedDistance === index }"
          @click="selectDistance(index)"
        >
          <div class="dist-name">{{ dist.name }}</div>
          <div class="dist-info">
            <span>📅 {{ dist.days }}天往返</span>
            <span>⚠️ 危险: {{ Math.round(dist.danger * 100) }}%</span>
          </div>
        </button>
      </div>
    </div>

    <div v-if="selectedDistance >= 0" class="supply-section">
      <div class="section-title">补给准备</div>
      
      <div class="supply-item">
        <div class="supply-label">
          <span>🍖 食物</span>
          <span class="supply-requirement">
            最低: {{ requirements.minFood }} | 推荐: {{ requirements.recommendedFood }}
          </span>
        </div>
        <div class="supply-control">
          <button class="ctrl-btn" @click="adjustSupply('food', -1)">-</button>
          <span class="supply-value">{{ foodAmount }}</span>
          <button class="ctrl-btn" @click="adjustSupply('food', 1)">+</button>
          <button class="ctrl-btn max-btn" @click="setMaxFood">最大</button>
        </div>
      </div>

      <div class="supply-item">
        <div class="supply-label">
          <span>🪵 木头</span>
          <span class="supply-requirement">
            最低: {{ requirements.minWood }} | 推荐: {{ requirements.recommendedWood }}
          </span>
        </div>
        <div class="supply-control">
          <button class="ctrl-btn" @click="adjustSupply('wood', -1)">-</button>
          <span class="supply-value">{{ woodAmount }}</span>
          <button class="ctrl-btn" @click="adjustSupply('wood', 1)">+</button>
          <button class="ctrl-btn max-btn" @click="setMaxWood">最大</button>
        </div>
      </div>
    </div>

    <div v-if="selectedDistance >= 0" class="equipment-section">
      <div class="section-title">装备携带</div>
      
      <div class="supply-item">
        <div class="supply-label">
          <span>🔧 工具</span>
          <span class="supply-requirement">提升收获 +15%/件</span>
        </div>
        <div class="supply-control">
          <button class="ctrl-btn" @click="adjustEquipment('tools', -1)">-</button>
          <span class="supply-value">{{ toolsAmount }}</span>
          <button class="ctrl-btn" @click="adjustEquipment('tools', 1)">+</button>
        </div>
      </div>

      <div class="supply-item">
        <div class="supply-label">
          <span>🦊 兽皮</span>
          <span class="supply-requirement">减少伤害 -10%/件</span>
        </div>
        <div class="supply-control">
          <button class="ctrl-btn" @click="adjustEquipment('hide', -1)">-</button>
          <span class="supply-value">{{ hideAmount }}</span>
          <button class="ctrl-btn" @click="adjustEquipment('hide', 1)">+</button>
        </div>
      </div>
    </div>

    <div v-if="selectedDistance >= 0" class="expedition-summary">
      <div class="summary-title">探险预估</div>
      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">往返天数</span>
          <span class="summary-value">{{ distances[selectedDistance].days * 2 }}天</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">危险等级</span>
          <span class="summary-value danger-text">{{ Math.round(distances[selectedDistance].danger * 100) }}%</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">奖励倍率</span>
          <span class="summary-value reward-text">x{{ distances[selectedDistance].rewardMultiplier }}</span>
        </div>
      </div>
    </div>

    <button 
      class="start-btn"
      :class="{ disabled: !canStart }"
      @click="handleStart"
    >
      🚶 出发探险
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  distances: { type: Array, required: true },
  food: { type: Number, default: 0 },
  wood: { type: Number, default: 0 },
  tools: { type: Number, default: 0 },
  hide: { type: Number, default: 0 },
  canStartExpedition: { type: Boolean, default: false },
  getSupplyRequirement: { type: Function, required: true }
})

const emit = defineEmits(['start'])

const selectedDistance = ref(0)
const foodAmount = ref(0)
const woodAmount = ref(0)
const toolsAmount = ref(0)
const hideAmount = ref(0)

const requirements = computed(() => {
  return props.getSupplyRequirement(selectedDistance.value) || { minFood: 0, minWood: 0, recommendedFood: 0, recommendedWood: 0 }
})

const canStart = computed(() => {
  if (!props.canStartExpedition) return false
  if (selectedDistance.value < 0) return false
  if (foodAmount.value < requirements.value.minFood) return false
  if (woodAmount.value < requirements.value.minWood) return false
  if (foodAmount.value > props.food) return false
  if (woodAmount.value > props.wood) return false
  if (toolsAmount.value > props.tools) return false
  if (hideAmount.value > props.hide) return false
  return true
})

watch(selectedDistance, () => {
  const req = requirements.value
  foodAmount.value = Math.min(req.recommendedFood, props.food)
  woodAmount.value = Math.min(req.recommendedWood, props.wood)
  toolsAmount.value = Math.min(1, props.tools)
  hideAmount.value = Math.min(1, props.hide)
}, { immediate: true })

function selectDistance(index) {
  selectedDistance.value = index
}

function adjustSupply(type, delta) {
  if (type === 'food') {
    const newValue = foodAmount.value + delta
    if (newValue >= 0 && newValue <= props.food) {
      foodAmount.value = newValue
    }
  } else if (type === 'wood') {
    const newValue = woodAmount.value + delta
    if (newValue >= 0 && newValue <= props.wood) {
      woodAmount.value = newValue
    }
  }
}

function adjustEquipment(type, delta) {
  if (type === 'tools') {
    const newValue = toolsAmount.value + delta
    if (newValue >= 0 && newValue <= props.tools) {
      toolsAmount.value = newValue
    }
  } else if (type === 'hide') {
    const newValue = hideAmount.value + delta
    if (newValue >= 0 && newValue <= props.hide) {
      hideAmount.value = newValue
    }
  }
}

function setMaxFood() {
  foodAmount.value = props.food
}

function setMaxWood() {
  woodAmount.value = props.wood
}

function handleStart() {
  if (!canStart.value) return
  emit('start', {
    distanceIndex: selectedDistance.value,
    supplies: {
      food: foodAmount.value,
      wood: woodAmount.value
    },
    equipment: {
      tools: toolsAmount.value,
      hide: hideAmount.value
    }
  })
}
</script>

<style scoped>
.expedition-prep {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.panel-title {
  color: white;
  font-size: 18px;
  margin-bottom: 15px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.distance-selector {
  margin-bottom: 20px;
}

.selector-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  margin-bottom: 10px;
}

.distance-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.distance-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.distance-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateX(5px);
}

.distance-btn.active {
  background: rgba(100, 150, 255, 0.3);
  border-color: rgba(100, 150, 255, 0.6);
}

.dist-name {
  font-weight: bold;
  font-size: 14px;
}

.dist-info {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.section-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.supply-section,
.equipment-section {
  margin-bottom: 20px;
}

.supply-item {
  margin-bottom: 12px;
}

.supply-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: white;
  font-size: 13px;
}

.supply-requirement {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.supply-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  color: white;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.ctrl-btn:active {
  transform: scale(0.95);
}

.max-btn {
  width: auto;
  padding: 0 12px;
  font-size: 12px;
  margin-left: auto;
}

.supply-value {
  min-width: 40px;
  text-align: center;
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.expedition-summary {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 20px;
}

.summary-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 10px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.summary-value {
  font-size: 14px;
  font-weight: bold;
  color: white;
}

.danger-text {
  color: #ff6b6b;
}

.reward-text {
  color: #51cf66;
}

.start-btn {
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #4ade80, #22c55e);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.start-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(74, 222, 128, 0.4);
}

.start-btn:active:not(.disabled) {
  transform: translateY(0);
}

.start-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
}
</style>
