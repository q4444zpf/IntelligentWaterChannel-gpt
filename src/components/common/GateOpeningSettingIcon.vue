<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <filter :id="backgroundShadowId" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
        <feFlood flood-opacity="0" result="BackgroundImageFix"/>
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feColorMatrix in="SourceAlpha" type="matrix" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
        <feOffset dy="0" dx="0"/>
        <feGaussianBlur stdDeviation="5"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"/>
        <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
      </filter>
      <linearGradient :id="primaryGradientId" x1="0.243" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#C0A1FE"/>
        <stop offset="35.7%" stop-color="#0D548D"/>
        <stop offset="64.6%" stop-color="#0D548D"/>
        <stop offset="100%" stop-color="#05FCFD"/>
      </linearGradient>
      <linearGradient :id="borderGradientId" x1="0.172" y1="-0.018" x2="0.693" y2="0.787">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.5"/>
      </linearGradient>
      <filter :id="iconShadowId" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
        <feFlood flood-opacity="0" result="BackgroundImageFix"/>
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feColorMatrix in="SourceAlpha" type="matrix" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
        <feOffset dy="2" dx="0"/>
        <feGaussianBlur stdDeviation="2"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"/>
        <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
      </filter>
      <clipPath :id="clipId"><rect x="3" y="5" width="18" height="14.4"/></clipPath>
    </defs>
    <g :filter="`url(#${backgroundShadowId})`">
      <rect width="24" height="24" rx="2" :fill="`url(#${primaryGradientId})`"/>
      <rect x="0.5" y="0.5" width="23" height="23" rx="1.5" :stroke="`url(#${borderGradientId})`" fill="none"/>
    </g>
    <g :filter="`url(#${iconShadowId})`">
      <g :clip-path="`url(#${clipId})`">
        <path d="M4.64 5H6.27V19.4H4.64Z" fill="#fff"/>
        <path d="M7.91 9.39C7.91 10.47 6.81 11.35 5.45 11.35C4.1 11.35 3 10.47 3 9.39C3 8.3 4.1 7.42 5.45 7.42C6.81 7.42 7.91 8.3 7.91 9.39Z" fill="#fff"/>
        <path d="M11.18 5H12.82V19.4H11.18Z" fill="#fff"/>
        <path d="M14.45 15.15C14.45 16.23 13.35 17.11 12 17.11C10.65 17.11 9.55 16.23 9.55 15.15C9.55 14.06 10.65 13.18 12 13.18C13.35 13.18 14.45 14.06 14.45 15.15Z" fill="#fff"/>
        <path d="M17.73 5H19.36V19.4H17.73Z" fill="#fff"/>
        <path d="M21 9.39C21 10.47 19.9 11.35 18.55 11.35C17.19 11.35 16.09 10.47 16.09 9.39C16.09 8.3 17.19 7.42 18.55 7.42C19.9 7.42 21 8.3 21 9.39Z" fill="#fff"/>
      </g>
    </g>
  </svg>
</template>

<script setup>
import { useId } from 'vue';

const idPrefix = useId().replace(/:/g, '');
const backgroundShadowId = `${idPrefix}-gate-setting-shadow`;
const primaryGradientId = `${idPrefix}-gate-setting-gradient`;
const borderGradientId = `${idPrefix}-gate-setting-border`;
const iconShadowId = `${idPrefix}-gate-setting-icon-shadow`;
const clipId = `${idPrefix}-gate-setting-clip`;
</script>
