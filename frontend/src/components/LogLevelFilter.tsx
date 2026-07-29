import { LogLevel } from "../types";

const LEVELS: LogLevel[] = ["ERROR", "WARN", "INFO"];

interface Props {
  value: LogLevel[];
  onChange: (levels: LogLevel[]) => void;
}

export default function LogLevelFilter({ value, onChange }: Props) {
  function toggle(level: LogLevel) {
    if (value.includes(level)) {
      onChange(value.filter((l) => l !== level));
    } else {
      onChange([...value, level]);
    }
  }

  return (
    <div className="field-group">
      <label>Log level</label>
      <div className="level-toggles">
        {LEVELS.map((level) => (
          <div
            key={level}
            className={`level-toggle ${level} ${value.includes(level) ? "active" : ""}`}
            onClick={() => toggle(level)}
          >
            <input type="checkbox" readOnly checked={value.includes(level)} />
            {level}
          </div>
        ))}
      </div>
    </div>
  );
}
