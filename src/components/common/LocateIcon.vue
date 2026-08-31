<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 25 22.66"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <filter
        :id="shadowId"
        filterUnits="objectBoundingBox"
        color-interpolation-filters="sRGB"
        x="0"
        y="0"
        width="1"
        height="1"
      >
        <feFlood flood-opacity="0" result="BackgroundImageFix"/>
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feColorMatrix in="SourceAlpha" type="matrix" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
        <feOffset dy="0" dx="0"/>
        <feGaussianBlur stdDeviation="2.5"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0"/>
        <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
      </filter>
      <linearGradient :id="primaryGradientId" x1="0.638" y1="0" x2="0.469" y2="0.995">
        <stop offset="15.7%" stop-color="#9D9DFF"/>
        <stop offset="38.7%" stop-color="#123A56"/>
        <stop offset="53.3%" stop-color="#123A56"/>
        <stop offset="100%" stop-color="#05FCFD"/>
      </linearGradient>
      <linearGradient :id="borderGradientId" x1="1" y1="0.71" x2="-0.057" y2="0.099">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8"/>
        <stop offset="87%" stop-color="#FFFFFF" stop-opacity="0.3"/>
      </linearGradient>
    </defs>
    <g :filter="`url(#${shadowId})`">
      <path
        d="M2.37 0.77C1.58 0.66 0.98 1.48 1.33 2.2L9.94 19.9C10.33 20.72 11.52 20.63 11.79 19.77L14.45 11.36C14.51 11.15 14.65 10.97 14.82 10.84L22.45 5.46C23.19 4.94 22.92 3.78 22.02 3.65L2.37 0.77Z"
        :fill="`url(#${primaryGradientId})`"
      />
      <path
        d="M12.27 19.92L14.92 11.51Q14.97 11.35 15.11 11.25L22.74 5.86Q23.57 5.28 23.34 4.29Q23.1 3.3 22.1 3.15L2.44 0.28Q1.55 0.15 1.02 0.88Q0.48 1.61 0.88 2.42L9.49 20.12Q9.93 21.04 10.95 20.96Q11.96 20.89 12.27 19.92ZM14.54 10.43Q14.12 10.73 13.97 11.21L11.32 19.62Q11.21 19.94 10.88 19.96Q10.54 19.99 10.39 19.68L1.78 1.98Q1.65 1.71 1.82 1.47Q2 1.22 2.3 1.27L21.95 4.14Q22.29 4.19 22.36 4.52Q22.44 4.85 22.17 5.05L14.54 10.43Z"
        fill-rule="evenodd"
        :fill="`url(#${borderGradientId})`"
      />
    </g>
  </svg>
</template>

<script setup>
import { useId } from 'vue';

const idPrefix = useId().replace(/:/g, '');
const shadowId = `${idPrefix}-locate-shadow`;
const primaryGradientId = `${idPrefix}-locate-primary`;
const borderGradientId = `${idPrefix}-locate-border`;
</script>
