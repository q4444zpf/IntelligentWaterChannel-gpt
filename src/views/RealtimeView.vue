<template>
  <section class="page page-realtime active">
    <div class="scene-stage">
      <SmartWaterFlumePreview
        ref="previewRef"
        :alarm-topic="alarmNotificationTopic"
        performance-mode
        @mqtt-data="handleMqttData"
        @alarm-notification="handleAlarmNotification"
      />
    </div>

    <header class="preview-console">
      <div class="preview-title">
        <span class="preview-title__arrow preview-title__arrow--left" aria-hidden="true"></span>
        <h1>三维水槽工艺监控</h1>
        <span class="preview-title__arrow preview-title__arrow--right" aria-hidden="true"></span>
      </div>
      <div class="preview-actions" aria-label="三维视角控制">
        <button
          v-for="action in VIEW_ACTIONS"
          :key="action"
          type="button"
          @click="handleViewAction(action)"
        >{{ action }}</button>
      </div>
    </header>

    <aside class="left-stack">
      <DecorativePanel class="panel gate-panel" title="闸门实时状态">
        <GateStatusChart :gates="gates" :empty-text="deviceMessage" />
      </DecorativePanel>

      <DecorativePanel class="panel sensor-panel" title="传感器实时状态">
        <div v-if="sensorGroups.length" class="sensor-tabs" role="tablist" aria-label="传感器类型">
          <div class="sensor-tabs__bg"></div>
          <button
            v-for="group in sensorGroups"
            :key="group.name"
            type="button"
            role="tab"
            :aria-selected="selectedSensorGroup?.name === group.name"
            :class="{ active: selectedSensorGroup?.name === group.name }"
            @click="activeSensorGroup = group.name"
          >
            {{ group.name }}
          </button>
        </div>
        <div class="sensor-list">
          <div v-if="selectedSensorGroup" class="sensor-section" role="tabpanel">
            <table class="data-table compact sensor-status-table">
              <thead>
                <tr>
                  <th class="col-status">状态</th>
                  <th class="col-name">水位</th>
                  <th class="col-location">所属渠道</th>
                  <th class="col-value">计量</th>
                  <th class="col-locate">三维定位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in selectedSensorGroup.rows" :key="row.tag || row.name">
                  <td :class="row.state === '在线' ? 'status-online' : 'status-offline'">
                    <span class="status-dot" :class="row.state === '在线' ? 'dot-online' : 'dot-offline'"></span>
                  </td>
                  <td>{{ row.name }}</td>
                  <td>{{ row.location }}</td>
                  <td>{{ row.value }} {{ row.unit }}</td>
                  <td>
                    <button type="button" class="locate-btn" title="三维定位" @click="handleLocate(row)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 25 22.66" fill="none">
                        <defs>
                          <filter id="locate-shadow" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
                            <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                            <feColorMatrix in="SourceAlpha" type="matrix" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                            <feOffset dy="0" dx="0"/>
                            <feGaussianBlur stdDeviation="2.5"/>
                            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
                            <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                          </filter>
                          <linearGradient id="locate-grad1" x1="0.638" y1="0" x2="0.469" y2="0.995">
                            <stop offset="15.7%" stop-color="#9D9DFF"/>
                            <stop offset="38.7%" stop-color="#123A56"/>
                            <stop offset="53.3%" stop-color="#123A56"/>
                            <stop offset="100%" stop-color="#05FCFD"/>
                          </linearGradient>
                          <linearGradient id="locate-grad2" x1="1" y1="0.71" x2="-0.057" y2="0.099">
                            <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
                            <stop offset="87%" stop-color="#FFFFFF" stop-opacity="0.3"/>
                          </linearGradient>
                        </defs>
                        <g filter="url(#locate-shadow)">
                          <path d="M2.37 0.77C1.58 0.66 0.98 1.48 1.33 2.2L9.94 19.9C10.33 20.72 11.52 20.63 11.79 19.77L14.45 11.36C14.51 11.15 14.65 10.97 14.82 10.84L22.45 5.46C23.19 4.94 22.92 3.78 22.02 3.65L2.37 0.77Z" fill="url(#locate-grad1)"/>
                          <path d="M12.27 19.92L14.92 11.51Q14.97 11.35 15.11 11.25L22.74 5.86Q23.57 5.28 23.34 4.29Q23.1 3.3 22.1 3.15L2.44 0.28Q1.55 0.15 1.02 0.88Q0.48 1.61 0.88 2.42L9.49 20.12Q9.93 21.04 10.95 20.96Q11.96 20.89 12.27 19.92ZM14.54 10.43Q14.12 10.73 13.97 11.21L11.32 19.62Q11.21 19.94 10.88 19.96Q10.54 19.99 10.39 19.68L1.78 1.98Q1.65 1.71 1.82 1.47Q2 1.22 2.3 1.27L21.95 4.14Q22.29 4.19 22.36 4.52Q22.44 4.85 22.17 5.05L14.54 10.43Z" fill-rule="evenodd" fill="url(#locate-grad2)"/>
                        </g>
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="realtime-empty">{{ deviceMessage }}</div>
        </div>
      </DecorativePanel>

      <TrendAnalysis
        class="realtime-info-panel"
        :profile-nodes="profileNodes"
        :realtime-values="realtimeValues"
        :profile-loading="profileLoading"
        :profile-error="profileError"
        :profile-timestamp="latestMqttAt"
      />
    </aside>

    <aside class="right-stack">
      <DecorativePanel class="panel control-panel" title="手动控制设备">
        <section class="control-section gate-control-section">
          <div class="gate-header">
            <h2 class="gate-title">闸门</h2>
            <div class="gate-tabs" role="tablist" aria-label="闸门列表">
              <button
                v-for="gate in gateList"
                :key="gate.id"
                type="button"
                role="tab"
                :aria-selected="selectedGate?.id === gate.id"
                :class="{ active: selectedGate?.id === gate.id }"
                @click="selectedGate = gate"
              >
                {{ gate.openingTag || gate.name }}
              </button>
            </div>
          </div>
          <div class="gate-display" v-if="selectedGate">
            <button type="button" class="gate-arrow gate-arrow--left" @click="cycleGate(-1)" aria-label="上一个闸门">
              <img src="../assets/arrow.png" alt="" />
            </button>
            <div class="gate-value-display">
              <div class="gate-value-bg"></div>
              <div class="gate-value-content">
                <span class="gate-value-number">{{ selectedGateOpening }}</span>
                <span class="gate-value-label">当前开度</span>
              </div>
            </div>
            <button type="button" class="gate-arrow gate-arrow--right" @click="cycleGate(1)" aria-label="下一个闸门">
              <img src="../assets/arrow.png" alt="" />
            </button>
          </div>
          <div class="gate-actions">
            <button type="button" class="gate-action-btn" @click="handleGateLocate">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="16" viewBox="0 0 25 22.66" fill="none">
                <defs>
                  <filter id="gate-locate-shadow" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
                    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                    <feOffset dy="0" dx="0"/>
                    <feGaussianBlur stdDeviation="2.5"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                  </filter>
                  <linearGradient id="gate-locate-grad1" x1="0.638" y1="0" x2="0.469" y2="0.995">
                    <stop offset="15.7%" stop-color="#9D9DFF"/>
                    <stop offset="38.7%" stop-color="#123A56"/>
                    <stop offset="53.3%" stop-color="#123A56"/>
                    <stop offset="100%" stop-color="#05FCFD"/>
                  </linearGradient>
                  <linearGradient id="gate-locate-grad2" x1="1" y1="0.71" x2="-0.057" y2="0.099">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
                    <stop offset="87%" stop-color="#FFFFFF" stop-opacity="0.3"/>
                  </linearGradient>
                </defs>
                <g filter="url(#gate-locate-shadow)">
                  <path d="M2.37 0.77C1.58 0.66 0.98 1.48 1.33 2.2L9.94 19.9C10.33 20.72 11.52 20.63 11.79 19.77L14.45 11.36C14.51 11.15 14.65 10.97 14.82 10.84L22.45 5.46C23.19 4.94 22.92 3.78 22.02 3.65L2.37 0.77Z" fill="url(#gate-locate-grad1)"/>
                  <path d="M12.27 19.92L14.92 11.51Q14.97 11.35 15.11 11.25L22.74 5.86Q23.57 5.28 23.34 4.29Q23.1 3.3 22.1 3.15L2.44 0.28Q1.55 0.15 1.02 0.88Q0.48 1.61 0.88 2.42L9.49 20.12Q9.93 21.04 10.95 20.96Q11.96 20.89 12.27 19.92ZM14.54 10.43Q14.12 10.73 13.97 11.21L11.32 19.62Q11.21 19.94 10.88 19.96Q10.54 19.99 10.39 19.68L1.78 1.98Q1.65 1.71 1.82 1.47Q2 1.22 2.3 1.27L21.95 4.14Q22.29 4.19 22.36 4.52Q22.44 4.85 22.17 5.05L14.54 10.43Z" fill-rule="evenodd" fill="url(#gate-locate-grad2)"/>
                </g>
              </svg>
              <span>三维定位</span>
            </button>
            <button type="button" class="gate-action-btn gate-action-btn--setting" @click="handleGateSetting">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <defs>
                  <filter id="gate-setting-shadow" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
                    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                    <feOffset dy="0" dx="0"/>
                    <feGaussianBlur stdDeviation="5"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"/>
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                  </filter>
                  <linearGradient id="gate-setting-grad1" x1="0.243" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-color="#C0A1FE"/>
                    <stop offset="35.7%" stop-color="#0D548D"/>
                    <stop offset="64.6%" stop-color="#0D548D"/>
                    <stop offset="100%" stop-color="#05FCFD"/>
                  </linearGradient>
                  <linearGradient id="gate-setting-grad2" x1="0.172" y1="-0.018" x2="0.693" y2="0.787">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
                    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.5"/>
                  </linearGradient>
                  <filter id="gate-setting-icon-shadow" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
                    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                    <feOffset dy="2" dx="0"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"/>
                    <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
                  </filter>
                  <clipPath id="gate-setting-clip"><rect x="3" y="5" width="18" height="14.4" rx="0"/></clipPath>
                </defs>
                <g filter="url(#gate-setting-shadow)">
                  <rect x="0" y="0" width="24" height="24" rx="2" fill="url(#gate-setting-grad1)"/>
                  <rect x="0.5" y="0.5" width="23" height="23" rx="1.5" stroke="url(#gate-setting-grad2)" fill-opacity="0" fill="none" stroke-width="1"/>
                </g>
                <g filter="url(#gate-setting-icon-shadow)">
                  <g clip-path="url(#gate-setting-clip)">
                    <path d="M4.64 5L6.27 5L6.27 19.4L4.64 19.4Z" fill="#fff"/>
                    <path d="M7.91 9.39Q7.91 9.48 7.9 9.58Q7.89 9.67 7.86 9.77Q7.84 9.86 7.8 9.96Q7.77 10.05 7.72 10.14Q7.68 10.23 7.62 10.31Q7.56 10.4 7.5 10.48Q7.43 10.56 7.35 10.63Q7.28 10.71 7.19 10.77Q7.1 10.84 7.01 10.9Q6.92 10.96 6.82 11.02Q6.72 11.07 6.61 11.12Q6.51 11.16 6.39 11.2Q6.28 11.24 6.17 11.26Q6.05 11.29 5.93 11.31Q5.82 11.33 5.7 11.34Q5.58 11.35 5.45 11.35Q5.33 11.35 5.21 11.34Q5.09 11.33 4.98 11.31Q4.86 11.29 4.74 11.26Q4.63 11.24 4.52 11.2Q4.4 11.16 4.3 11.12Q4.19 11.07 4.09 11.02Q3.99 10.96 3.9 10.9Q3.8 10.84 3.72 10.77Q3.63 10.71 3.56 10.63Q3.48 10.56 3.41 10.48Q3.35 10.4 3.29 10.31Q3.23 10.23 3.19 10.14Q3.14 10.05 3.11 9.96Q3.07 9.86 3.05 9.77Q3.02 9.67 3.01 9.58Q3 9.48 3 9.39Q3 9.29 3.01 9.19Q3.02 9.1 3.05 9Q3.07 8.91 3.11 8.82Q3.14 8.72 3.19 8.63Q3.23 8.54 3.29 8.46Q3.35 8.37 3.41 8.29Q3.48 8.21 3.56 8.14Q3.63 8.07 3.72 8Q3.8 7.93 3.9 7.87Q3.99 7.81 4.09 7.75Q4.19 7.7 4.3 7.65Q4.4 7.61 4.52 7.57Q4.63 7.53 4.74 7.51Q4.86 7.48 4.98 7.46Q5.09 7.44 5.21 7.43Q5.33 7.42 5.45 7.42Q5.58 7.42 5.7 7.43Q5.82 7.44 5.93 7.46Q6.05 7.48 6.17 7.51Q6.28 7.53 6.39 7.57Q6.51 7.61 6.61 7.65Q6.72 7.7 6.82 7.75Q6.92 7.81 7.01 7.87Q7.1 7.93 7.19 8Q7.28 8.07 7.35 8.14Q7.43 8.21 7.5 8.29Q7.56 8.37 7.62 8.46Q7.68 8.54 7.72 8.63Q7.77 8.72 7.8 8.82Q7.84 8.91 7.86 9Q7.89 9.1 7.9 9.19Q7.91 9.29 7.91 9.39Z" fill="#fff"/>
                    <path d="M11.18 5L12.82 5L12.82 19.4L11.18 19.4Z" fill="#fff"/>
                    <path d="M14.45 15.15Q14.45 15.24 14.44 15.34Q14.43 15.43 14.41 15.53Q14.38 15.62 14.35 15.72Q14.31 15.81 14.27 15.9Q14.22 15.99 14.16 16.07Q14.11 16.16 14.04 16.24Q13.97 16.32 13.9 16.39Q13.82 16.47 13.74 16.53Q13.65 16.6 13.56 16.66Q13.46 16.72 13.36 16.78Q13.26 16.83 13.16 16.88Q13.05 16.92 12.94 16.96Q12.83 17 12.71 17.02Q12.6 17.05 12.48 17.07Q12.36 17.09 12.24 17.1Q12.12 17.11 12 17.11Q11.88 17.11 11.76 17.1Q11.64 17.09 11.52 17.07Q11.4 17.05 11.29 17.02Q11.17 17 11.06 16.96Q10.95 16.92 10.84 16.88Q10.74 16.83 10.64 16.78Q10.54 16.72 10.44 16.66Q10.35 16.6 10.26 16.53Q10.18 16.47 10.1 16.39Q10.03 16.32 9.96 16.24Q9.89 16.16 9.84 16.07Q9.78 15.99 9.73 15.9Q9.69 15.81 9.65 15.72Q9.62 15.62 9.59 15.53Q9.57 15.43 9.56 15.34Q9.55 15.24 9.55 15.15Q9.55 15.05 9.56 14.95Q9.57 14.86 9.59 14.76Q9.62 14.67 9.65 14.58Q9.69 14.48 9.73 14.39Q9.78 14.3 9.84 14.22Q9.89 14.13 9.96 14.05Q10.03 13.97 10.1 13.9Q10.18 13.83 10.26 13.76Q10.35 13.69 10.44 13.63Q10.54 13.57 10.64 13.51Q10.74 13.46 10.84 13.41Q10.95 13.37 11.06 13.33Q11.17 13.29 11.29 13.27Q11.4 13.24 11.52 13.22Q11.64 13.2 11.76 13.19Q11.88 13.18 12 13.18Q12.12 13.18 12.24 13.19Q12.36 13.2 12.48 13.22Q12.6 13.24 12.71 13.27Q12.83 13.29 12.94 13.33Q13.05 13.37 13.16 13.41Q13.26 13.46 13.36 13.51Q13.46 13.57 13.56 13.63Q13.65 13.69 13.74 13.76Q13.82 13.83 13.9 13.9Q13.97 13.97 14.04 14.05Q14.11 14.13 14.16 14.22Q14.22 14.3 14.27 14.39Q14.31 14.48 14.35 14.58Q14.38 14.67 14.41 14.76Q14.43 14.86 14.44 14.95Q14.45 15.05 14.45 15.15Z" fill="#fff"/>
                    <path d="M17.73 5L19.36 5L19.36 19.4L17.73 19.4Z" fill="#fff"/>
                    <path d="M21 9.39Q21 9.48 20.99 9.58Q20.98 9.67 20.95 9.77Q20.93 9.86 20.89 9.96Q20.86 10.05 20.81 10.14Q20.77 10.23 20.71 10.31Q20.65 10.4 20.59 10.48Q20.52 10.56 20.44 10.63Q20.37 10.71 20.28 10.77Q20.2 10.84 20.1 10.9Q20.01 10.96 19.91 11.02Q19.81 11.07 19.7 11.12Q19.6 11.16 19.48 11.2Q19.37 11.24 19.26 11.26Q19.14 11.29 19.02 11.31Q18.91 11.33 18.79 11.34Q18.67 11.35 18.55 11.35Q18.42 11.35 18.3 11.34Q18.18 11.33 18.07 11.31Q17.95 11.29 17.83 11.26Q17.72 11.24 17.61 11.2Q17.49 11.16 17.39 11.12Q17.28 11.07 17.18 11.02Q17.08 10.96 16.99 10.9Q16.9 10.84 16.81 10.77Q16.72 10.71 16.65 10.63Q16.57 10.56 16.5 10.48Q16.44 10.4 16.38 10.31Q16.32 10.23 16.28 10.14Q16.23 10.05 16.2 9.96Q16.16 9.86 16.14 9.77Q16.11 9.67 16.1 9.58Q16.09 9.48 16.09 9.39Q16.09 9.29 16.1 9.19Q16.11 9.1 16.14 9Q16.16 8.91 16.2 8.82Q16.23 8.72 16.28 8.63Q16.32 8.54 16.38 8.46Q16.44 8.37 16.5 8.29Q16.57 8.21 16.65 8.14Q16.72 8.07 16.81 8Q16.9 7.93 16.99 7.87Q17.08 7.81 17.18 7.75Q17.28 7.7 17.39 7.65Q17.49 7.61 17.61 7.57Q17.72 7.53 17.83 7.51Q17.95 7.48 18.07 7.46Q18.18 7.44 18.3 7.43Q18.42 7.42 18.55 7.42Q18.67 7.42 18.79 7.43Q18.91 7.44 19.02 7.46Q19.14 7.48 19.26 7.51Q19.37 7.53 19.48 7.57Q19.6 7.61 19.7 7.65Q19.81 7.7 19.91 7.75Q20.01 7.81 20.1 7.87Q20.2 7.93 20.28 8Q20.37 8.07 20.44 8.14Q20.52 8.21 20.59 8.29Q20.65 8.37 20.71 8.46Q20.77 8.54 20.81 8.63Q20.86 8.72 20.89 8.82Q20.93 8.91 20.95 9Q20.98 9.1 20.99 9.19Q21 9.29 21 9.39Z" fill="#fff"/>
                  </g>
                </g>
              </svg>
              <span>设置开度</span>
            </button>
          </div>
        </section>

        <section class="control-section">
          <div class="control-section__head">
            <h2><PoweroffOutlined aria-hidden="true" />水泵</h2>
            <span class="running-state"><span aria-hidden="true"></span>运行中</span>
          </div>
          <div class="control-device-row">
            <label for="pump-device">设备</label>
            <select id="pump-device"><option>P1</option><option>P2</option></select>
            <strong>当前 32Hz</strong>
          </div>
          <div class="control-value"><span>目标频率</span><b>{{ targetPumpFrequency }}<small>Hz</small></b></div>
          <input
            v-model.number="targetPumpFrequency"
            type="range"
            min="0"
            max="50"
            step="1"
            aria-label="水泵目标频率"
            :style="{ '--range-progress': `${(targetPumpFrequency / 50) * 100}%` }"
          >
          <div class="button-row">
            <button type="button"><PlayCircleOutlined aria-hidden="true" /><span>启动</span></button>
            <button class="danger-command" type="button"><PauseCircleOutlined aria-hidden="true" /><span>停止</span></button>
            <button type="button"><SettingOutlined aria-hidden="true" /><span>设置频率</span></button>
          </div>
        </section>

        <section class="control-section">
          <div class="control-section__head">
            <h2><ControlOutlined aria-hidden="true" />阀门</h2>
            <span class="running-state"><span aria-hidden="true"></span>在线</span>
          </div>
          <div class="control-device-row">
            <label for="valve-device">设备</label>
            <select id="valve-device"><option>V3</option><option>V1</option><option>V2</option></select>
            <strong>当前 46%</strong>
          </div>
          <div class="control-value"><span>目标开度</span><b>{{ targetValveOpening }}<small>%</small></b></div>
          <input
            v-model.number="targetValveOpening"
            type="range"
            min="0"
            max="100"
            step="1"
            aria-label="阀门目标开度"
            :style="{ '--range-progress': `${targetValveOpening}%` }"
          >
          <div class="button-row">
            <button type="button"><SettingOutlined aria-hidden="true" /><span>设置开度</span></button>
            <button class="danger-command" type="button"><PauseCircleOutlined aria-hidden="true" /><span>停止</span></button>
            <button type="button"><ReloadOutlined aria-hidden="true" /><span>复位</span></button>
          </div>
        </section>
      </DecorativePanel>
    </aside>
  </section>
</template>

<script setup>
import {
  ControlOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  PoweroffOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import { getBigWaterChannelAlarmNotificationTopic } from '../api/alarm.js';
import {
  getRealtimeGroupDevices,
  getRealtimeWaterProfileTopology,
} from '../api/realtime.js';
import DecorativePanel from '../components/common/DecorativePanel.vue';
import GateStatusChart from '../components/realtime/GateStatusChart.vue';
import SmartWaterFlumePreview from '../components/realtime/smart-water-flume-preview/SmartWaterFlumePreview.vue';
import TrendAnalysis from '../components/realtime/trend/TrendAnalysis.vue';
import { VIEW_ACTIONS } from '../data/monitoring-data.js';
import { buildRealtimeTableData, mergeRealtimeValues } from '../realtime-device-data.js';

const props = defineProps({
  sceneTarget: { type: Object, default: null },
});

const previewRef = ref(null);
const targetGateOpening = ref(50);
const targetPumpFrequency = ref(35);
const targetValveOpening = ref(52);
const deviceGroups = ref([]);
const deviceLoading = ref(true);
const deviceError = ref('');
const realtimeValues = reactive({});
const profileNodes = ref([]);
const profileLoading = ref(true);
const profileError = ref('');
const latestMqttAt = ref(null);
const alarmNotificationTopic = ref('');
let realtimeUpdateTimer = null;
let pendingRealtimePayload = null;

const tableData = computed(() => buildRealtimeTableData(deviceGroups.value, realtimeValues));
const gates = computed(() => tableData.value.gates);
const gateList = computed(() => tableData.value.gateList || []);
const selectedGate = ref(null);
const selectedGateOpening = computed(() => {
  const gate = selectedGate.value;
  if (!gate) return 0;
  const val = parseFloat(gate.open);
  return Number.isNaN(val) ? 0 : Math.round(val);
});
const sensorGroups = computed(() => tableData.value.sensorGroups);
const activeSensorGroup = ref('');
const selectedSensorGroup = computed(() => sensorGroups.value.find(
  (group) => group.name === activeSensorGroup.value,
) || sensorGroups.value[0] || null);
const deviceMessage = computed(() => {
  if (deviceLoading.value) return '正在加载设备配置...';
  return deviceError.value || '暂无设备配置';
});

function flushRealtimePayload() {
  realtimeUpdateTimer = null;
  const payload = pendingRealtimePayload;
  pendingRealtimePayload = null;
  if (!payload) return;
  mergeRealtimeValues(realtimeValues, payload);
  latestMqttAt.value = Date.now();
}

function handleMqttData(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
  pendingRealtimePayload = { ...(pendingRealtimePayload || {}), ...payload };
  if (realtimeUpdateTimer === null) {
    realtimeUpdateTimer = window.setTimeout(flushRealtimePayload, 100);
  }
}

function handleViewAction(action) {
  if (action === '刷新') {
    void previewRef.value?.reload();
    return;
  }
  previewRef.value?.handleAction(action);
}

function handleAlarmNotification(payload) {
  window.dispatchEvent(new CustomEvent('alarm-notification', { detail: payload }));
}

function handleLocate(row) {
  if (row?.location) {
    previewRef.value?.focusSceneTreeGroupByName(row.location);
  }
}

function cycleGate(direction) {
  if (!gateList.value.length) return;
  const idx = gateList.value.findIndex((g) => g.id === selectedGate.value?.id);
  const next = (idx + direction + gateList.value.length) % gateList.value.length;
  selectedGate.value = gateList.value[next];
}

function handleGateLocate() {
  if (selectedGate.value?.location) {
    previewRef.value?.focusSceneTreeGroupByName(selectedGate.value.location);
  }
}

function handleGateSetting() {
  // TODO: implement gate opening setting
}

async function loadAlarmNotificationTopic() {
  try {
    alarmNotificationTopic.value = await getBigWaterChannelAlarmNotificationTopic();
  } catch (error) {
    console.error('获取告警通知主题失败', error);
  }
}

async function loadRealtimeDevices() {
  deviceLoading.value = true;
  deviceError.value = '';

  try {
    deviceGroups.value = await getRealtimeGroupDevices();
  } catch (error) {
    deviceError.value = error?.message || '获取实时设备配置失败';
  } finally {
    deviceLoading.value = false;
  }
}

async function loadRealtimeProfileTopology() {
  profileLoading.value = true;
  profileError.value = '';

  try {
    profileNodes.value = await getRealtimeWaterProfileTopology();
  } catch (error) {
    profileError.value = error?.message || '获取节点水位拓扑失败';
  } finally {
    profileLoading.value = false;
  }
}

watch(() => props.sceneTarget, async (target) => {
  const channelName = typeof target?.channelName === 'string' ? target.channelName.trim() : '';
  if (!channelName) return;
  await nextTick();
  previewRef.value?.focusSceneTreeGroupByName(channelName);
});

watch(gateList, (list) => {
  if (list?.length && !selectedGate.value) {
    selectedGate.value = list[0];
  }
}, { immediate: true, deep: true });

onMounted(() => {
  void loadAlarmNotificationTopic();
  void loadRealtimeDevices();
  void loadRealtimeProfileTopology();
});

onBeforeUnmount(() => {
  if (realtimeUpdateTimer !== null) window.clearTimeout(realtimeUpdateTimer);
  realtimeUpdateTimer = null;
  pendingRealtimePayload = null;
});
</script>

<style scoped>
.page-realtime {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
}

.scene-stage {
  position: absolute;
  inset: 0;
}

.scene-stage {
  z-index: 0;
  overflow: hidden;
}

.scene-stage :deep(.flume-preview) {
  position: absolute;
  inset: 0;
}

.preview-console {
  position: absolute;
  top: 18px;
  left: 50%;
  z-index: 6;
  display: flex;
  width: min(720px, calc(100% - 840px));
  min-width: 430px;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  transform: translateX(-50%);
}

.preview-title {
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.preview-title h1 {
  margin: 0;
  padding: 0 10px;
  color: #fff;
  font-family: 'SimHei', 'Microsoft YaHei', sans-serif;
  font-size: 30px;
  font-weight: normal;
  line-height: 38px;
  text-shadow: 0 0 13px rgba(64, 195, 255, 0.42);
  white-space: nowrap;
}

.preview-title__arrow {
  display: block;
  width: 53px;
  height: 36px;
  flex: 0 0 53px;
  background: url('../assets/preview-title.png') center / 100% 100% no-repeat;
}

.preview-title__arrow--right {
  transform: scaleX(-1);
}

.preview-actions {
  display: flex;
  width: max-content;
  max-width: 100%;
  height: 48px;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 24px;
  background: url('../assets/preview-actions.png') center / 100% 100% no-repeat;
  pointer-events: auto;
}

.preview-actions button {
  position: relative;
  height: 32px;
  padding: 0 9px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: #caeaff;
  font-size: 13px;
  line-height: 32px;
  white-space: nowrap;
}

.preview-actions button:hover,
.preview-actions button:focus-visible {
  outline: 0;
  background: transparent;
  box-shadow: none;
  color: #28d9ff;
}

.preview-actions button:hover::after,
.preview-actions button:focus-visible::after {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 0;
  border-top: 5px solid #28d9ff;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
  content: '';
  transform: translateX(-50%);
}

.left-stack,
.right-stack {
  position: absolute;
  z-index: 5;
  top: 22px;
  bottom: 18px;
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: 10px;
}

.left-stack {
  left: 0;
  width: clamp(340px, 20vw, 392px);
}

.right-stack {
  right: 0;
  width: clamp(336px, 19vw, 372px);
}

.panel,
.realtime-info-panel {
  min-height: 0;
  background: rgba(1, 28, 55, 0.54);
  backdrop-filter: blur(3px);
}

.gate-panel {
  flex: 0 0 214px;
}

.sensor-panel {
  flex: 0 0 268px;
}

.realtime-info-panel {
  flex: 1 1 0;
}

.sensor-panel :deep(.decorative-panel__content) {
  padding: 5px 10px 9px;
}

.gate-panel :deep(.decorative-panel__content) {
  display: flex;
  min-height: 0;
  padding: 0 10px 7px;
  overflow: hidden;
}

.sensor-panel :deep(.decorative-panel__content) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.data-table {
  width: 100%;
  margin: 0;
  border: 0;
  border-collapse: separate;
  border-spacing: 0 1px;
  border-radius: 0;
  background: transparent;
  table-layout: fixed;
}

.data-table th,
.data-table td {
  height: 30px;
  padding: 0 5px;
  overflow: hidden;
  border: 0;
  color: #b9d4e8;
  font-size: 11px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data-table th {
  background: rgba(32, 101, 150, 0.82);
  color: #e7f6ff;
  font-weight: 600;
}

.data-table tbody tr:nth-child(even) td {
  background: rgba(32, 101, 150, 0.16);
}

.status-online {
  color: #43ff86 !important;
}

.status-offline {
  color: #ff6862 !important;
}

.sensor-list {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(55, 175, 237, 0.5) transparent;
}

.sensor-tabs {
  position: relative;
  display: flex;
  min-width: 0;
  flex: 0 0 31px;
  align-items: center;
  margin-bottom: 4px;
  padding: 0;
}

.sensor-tabs__bg {
  position: absolute;
  inset: 0;
  background: url('../assets/table-header.png') center / 100% 100% no-repeat, #206596;
  pointer-events: none;
}

.sensor-tabs button {
  position: relative;
  min-width: 0;
  height: 31px;
  flex: 1 1 0;
  overflow: hidden;
  border: 0;
  outline: none;
  box-shadow: none;
  padding: 0 5px;
  background: transparent;
  color: #8ebbd6;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.2s ease;
}

.sensor-tabs button:hover {
  color: #dff8ff;
  outline: none;
  box-shadow: none;
}

.sensor-tabs button.active {
  color: #ffffff;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(110, 234, 255, 0.6);
}

.sensor-tabs button.active::after {
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 20px;
  height: 3px;
  background: #6eeaff;
  border-radius: 2px 2px 0 0;
  box-shadow: 0 0 8px rgba(110, 234, 255, 0.8);
  content: '';
  transform: translateX(-50%);
}

.sensor-section {
  margin: 0;
  border: 0;
  background: transparent;
}

.sensor-status-table th:nth-child(1),
.sensor-status-table td:nth-child(1) { width: 12%; }
.sensor-status-table th:nth-child(2),
.sensor-status-table td:nth-child(2) { width: 22%; }
.sensor-status-table th:nth-child(3),
.sensor-status-table td:nth-child(3) { width: 22%; }
.sensor-status-table th:nth-child(4),
.sensor-status-table td:nth-child(4) { width: 26%; }
.sensor-status-table th:nth-child(5),
.sensor-status-table td:nth-child(5) { width: 18%; }

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.dot-online {
  background: #43ff86;
  box-shadow: 0 0 6px rgba(67, 255, 134, 0.8);
}

.status-dot.dot-offline {
  background: #ff6862;
  box-shadow: 0 0 6px rgba(255, 104, 98, 0.8);
}

.locate-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  outline: none;
  box-shadow: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  transition: filter 0.2s ease;
}

.locate-btn:hover {
  outline: none;
  box-shadow: none;
  filter: brightness(1.3) drop-shadow(0 0 4px rgba(110, 234, 255, 0.8));
}

.locate-btn svg {
  width: 18px;
  height: 16px;
}

.realtime-empty {
  padding: 14px 8px;
  color: #7f9db3;
  text-align: center;
}

.realtime-info-panel :deep(.water-profile-shell) {
  min-height: 0;
}

.control-panel {
  height: 100%;
}

.control-panel :deep(.decorative-panel__content) {
  padding: 2px 14px 7px;
  overflow-y: auto;
}

.control-section {
  padding: 11px 2px 13px;
}

/* Gate control section */
.gate-control-section {
  padding: 8px 2px 10px;
}

.gate-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.gate-title {
  margin: 0;
  padding: 0;
  flex-shrink: 0;
  background: linear-gradient(180deg, #ffffff 48%, #05fcfd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.2;
}

.gate-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.gate-tabs button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #5A7E9B;
  border-radius: 50%;
  background: #47657D;
  box-sizing: border-box;
  color: #cfe3f4;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gate-tabs button:hover {
  border-color: #6fb4e8;
  color: #eaf8ff;
}

.gate-tabs button.active {
  border-color: #6fb4e8;
  background: #2a7ab0;
  color: #eaf8ff;
}

.gate-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 16px;
}

.gate-arrow {
  width: 80px;
  height: 80px;
  border: 0;
  outline: none;
  box-shadow: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.2s ease;
}

.gate-arrow:hover {
  opacity: 1;
}

.gate-arrow img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.gate-arrow--right img {
  transform: scaleX(-1);
}

.gate-value-display {
  position: relative;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate-value-bg {
  position: absolute;
  inset: 0;
  background: url('../assets/value_bg.png') center / contain no-repeat;
}

.gate-value-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 8px;
}

.gate-value-number {
  background: linear-gradient(180deg, #facb64 0%, #ffffff 55%, #e0a115 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.gate-value-label {
  margin-top: 4px;
  color: #8fb4cd;
  font-size: 11px;
}

.gate-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.gate-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  border: 1px solid rgba(103, 207, 255, 0.42);
  border-radius: 16px;
  background: rgba(17, 78, 121, 0.62);
  color: #eaf8ff;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.gate-action-btn:hover {
  border-color: rgba(103, 219, 255, 0.86);
  background: rgba(15, 104, 163, 0.82);
}

.gate-action-btn svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.gate-action-btn--setting svg {
  width: 20px;
  height: 20px;
}

/* End gate control section */

.control-section + .control-section {
  border-top: 1px solid rgba(70, 171, 228, 0.34);
}

.control-section__head,
.control-device-row,
.control-value {
  display: flex;
  align-items: center;
}

.control-section__head {
  justify-content: space-between;
  margin-bottom: 9px;
}

.control-section__head h2 {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  padding: 0;
  color: #eff9ff;
  font-size: 14px;
  line-height: 22px;
}

.control-section__head h2 :deep(svg) {
  color: #43cfff;
}

.running-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #70e7a2;
  font-size: 11px;
}

.running-state > span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #58e29a;
  box-shadow: 0 0 7px rgba(88, 226, 154, 0.75);
}

.control-device-row {
  gap: 7px;
  color: #8fb4cd;
  font-size: 11px;
}

.control-device-row label {
  flex: 0 0 auto;
}

.control-device-row select {
  width: 78px;
  height: 28px;
  padding: 0 24px 0 8px;
  border: 1px solid rgba(73, 175, 232, 0.55);
  border-radius: 3px;
  outline: 0;
  background: rgba(3, 43, 76, 0.88);
  color: #e4f5ff;
  font-size: 11px;
}

.control-device-row strong {
  margin-left: auto;
  color: #dceeff;
  font-size: 11px;
  font-weight: 500;
}

.control-value {
  justify-content: space-between;
  margin: 7px 0 -1px;
  color: #8fb4cd;
  font-size: 11px;
}

.control-value b {
  color: #ffd45c;
  font-size: 24px;
  line-height: 28px;
}

.control-value small {
  margin-left: 3px;
  color: #d7e9f6;
  font-size: 11px;
  font-weight: 500;
}

.control-section input[type='range'] {
  width: 100%;
  height: 14px;
  margin: 7px 0 10px;
  appearance: none;
  outline: 0;
  background: transparent;
}

.control-section input[type='range']::-webkit-slider-runnable-track {
  height: 7px;
  border: 1px solid #0b9dcc;
  border-radius: 4px;
  background: linear-gradient(90deg, #30c6ec 0%, #087ebc var(--range-progress), rgba(3, 45, 78, 0.92) var(--range-progress), rgba(3, 45, 78, 0.92) 100%);
}

.control-section input[type='range']::-webkit-slider-thumb {
  width: 15px;
  height: 15px;
  margin-top: -5px;
  appearance: none;
  border: 1px solid #8be3ff;
  border-radius: 50%;
  background: #57c9ef;
  box-shadow: 0 0 7px rgba(75, 201, 255, 0.8);
}

.control-section input[type='range']::-moz-range-track {
  height: 7px;
  border: 1px solid #0b9dcc;
  border-radius: 4px;
  background: linear-gradient(90deg, #30c6ec 0%, #087ebc var(--range-progress), rgba(3, 45, 78, 0.92) var(--range-progress), rgba(3, 45, 78, 0.92) 100%);
}

.control-section input[type='range']::-moz-range-thumb {
  width: 15px;
  height: 15px;
  border: 1px solid #8be3ff;
  border-radius: 50%;
  background: #57c9ef;
  box-shadow: 0 0 7px rgba(75, 201, 255, 0.8);
}

.button-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.button-row button {
  display: inline-flex;
  min-width: 0;
  height: 30px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 4px;
  border: 1px solid rgba(103, 207, 255, 0.42);
  border-radius: 3px;
  background: rgba(17, 78, 121, 0.62);
  box-shadow: inset 0 3px 9px rgba(133, 192, 251, 0.26);
  color: #eaf8ff;
  font-size: 10px;
  white-space: nowrap;
}

.button-row button:hover,
.button-row button:focus-visible {
  border-color: rgba(103, 219, 255, 0.86);
  outline: 0;
  background: rgba(15, 104, 163, 0.82);
}

.button-row button :deep(svg) {
  width: 13px;
  height: 13px;
  flex: 0 0 13px;
  color: #4fe1ff;
}

.button-row .danger-command :deep(svg) {
  color: #ff7b77;
}

@media (max-width: 1500px) {
  .left-stack {
    width: 330px;
  }

  .right-stack {
    width: 324px;
  }

  .preview-console {
    width: calc(100% - 720px);
    min-width: 390px;
  }

  .preview-title h1 {
    font-size: 26px;
  }

  .preview-actions button {
    padding: 0 5px;
    font-size: 11px;
  }
}

@media (max-height: 820px) {
  .gate-panel {
    flex-basis: 176px;
  }

  .sensor-panel {
    flex-basis: 210px;
  }

  .control-section {
    padding-top: 4px;
    padding-bottom: 5px;
  }

  .control-section__head {
    margin-bottom: 4px;
  }

  .control-device-row select {
    height: 24px;
  }

  .control-value {
    margin-top: 3px;
  }

  .control-section input[type='range'] {
    margin-top: 4px;
    margin-bottom: 6px;
  }

  .button-row button {
    height: 27px;
  }

  .control-value b {
    font-size: 20px;
  }
}
</style>