import { useEffect, useRef } from "react";

const OTP_LENGTH = 6;

const OtpInput = ({ value, onChange, disabled = false, hasError = false, autoFocus = true }) => {
  const refs = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || "");

  useEffect(() => {
    if (autoFocus && !disabled) refs.current[0]?.focus();
  }, [autoFocus, disabled]);

  const setDigit = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    onChange(next.join(""));
    if (digit && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      onChange(next.join(""));
      refs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    onChange(pasted);
    refs.current[Math.min(pasted.length, OTP_LENGTH) - 1]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { refs.current[index] = element; }}
          aria-label={`Verification code digit ${index + 1}`}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          onFocus={(event) => event.target.select()}
          className={`h-12 w-10 rounded-xl border bg-white text-center text-xl font-extrabold text-slate-900 outline-none transition sm:h-14 sm:w-12 sm:text-2xl dark:bg-[#1a1a1d] dark:text-white ${
            hasError
              ? "border-red-300 ring-2 ring-red-100"
              : "border-slate-200 focus:border-pink-400 focus:ring-4 focus:ring-pink-100 dark:border-neutral-700"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        />
      ))}
    </div>
  );
};

export default OtpInput;
