"use client";

import StatsCard from "./StatsCard";

export default function KpiGrid({ items = [], columns = 4 }) {
  return (
    <section
      className="grid gap-5"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      }}
    >
      {items.map((item) => (
        <StatsCard
          key={item.title}
          title={item.title}
          value={item.value}
          icon={item.icon}
          color={item.color}
          change={item.change}
          changeType={item.changeType}
          subtitle={item.subtitle}
          onClick={item.onClick}
        />
      ))}
    </section>
  );
}