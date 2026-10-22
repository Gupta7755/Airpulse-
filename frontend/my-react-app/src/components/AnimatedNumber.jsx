import React, { useState, useEffect, useRef } from 'react';

/**
 * AnimatedNumber - High-performance numerical counter with rapid transition from 0 to target value.
 *
 * Props:
 * - value: Number or numeric string (e.g. 138.08, "138.08", 4922, "₹14,250", "+12.4%", "12.5%").
 * - duration: Animation duration in milliseconds (default: 800ms for fast, snappy counting).
 * - decimals: Number of decimal places (auto-detected if undefined).
 * - prefix: String to prepend (e.g. '₹', '+'). Auto-extracted if present in value.
 * - suffix: String to append (e.g. '%'). Auto-extracted if present in value.
 * - formatCommas: Boolean, whether to format thousands with commas (default: true).
 * - className: Optional styling class name.
 */
export default function AnimatedNumber({
  value,
  duration = 800,
  decimals,
  prefix = '',
  suffix = '',
  formatCommas = true,
  className = ''
}) {
  const strVal = String(value ?? '0');

  // Auto-detect common prefixes and suffixes if not explicitly passed
  let autoPrefix = prefix;
  let autoSuffix = suffix;
  let cleanStr = strVal.trim();

  if (!prefix) {
    if (cleanStr.startsWith('₹')) {
      autoPrefix = '₹';
      cleanStr = cleanStr.slice(1).trim();
    } else if (cleanStr.startsWith('Rs. ')) {
      autoPrefix = 'Rs. ';
      cleanStr = cleanStr.slice(4).trim();
    } else if (cleanStr.startsWith('Rs.')) {
      autoPrefix = 'Rs.';
      cleanStr = cleanStr.slice(3).trim();
    } else if (cleanStr.startsWith('+')) {
      autoPrefix = '+';
      cleanStr = cleanStr.slice(1).trim();
    } else if (cleanStr.startsWith('-')) {
      autoPrefix = '-';
      cleanStr = cleanStr.slice(1).trim();
    }
  }

  if (!suffix) {
    if (cleanStr.endsWith('%')) {
      autoSuffix = '%';
      cleanStr = cleanStr.slice(0, -1).trim();
    }
  }

  // Remove commas to parse as clean number
  cleanStr = cleanStr.replace(/,/g, '');
  const targetNum = parseFloat(cleanStr);
  const isValidNum = !isNaN(targetNum);

  // Auto-detect decimals if not provided
  let decCount = decimals;
  if (decCount === undefined) {
    if (cleanStr.includes('.')) {
      decCount = cleanStr.split('.')[1].length;
    } else {
      decCount = 0;
    }
  }

  const [displayNum, setDisplayNum] = useState(0);
  const startRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!isValidNum) return;

    let startTime = null;
    const startVal = 0; // Always start counting smoothly from 0 on load
    const diff = targetNum - startVal;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Fast-start exponential ease-out curve (feels energetic and snappy)
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startVal + diff * easeProgress;

      setDisplayNum(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayNum(targetNum);
        startRef.current = targetNum;
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetNum, duration, isValidNum]);

  if (!isValidNum) {
    return <span className={className}>{value}</span>;
  }

  // Format with fixed decimals and optional thousands separators
  const fixedStr = displayNum.toFixed(decCount);
  let formatted = fixedStr;
  if (formatCommas) {
    const parts = fixedStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  return (
    <span className={className}>
      {autoPrefix}{formatted}{autoSuffix}
    </span>
  );
}

