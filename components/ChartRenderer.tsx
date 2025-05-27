"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartData } from "@/types/chart";

// Custom tooltip component to replace ChartTooltipContent
const CustomTooltip = ({ active, payload, label, formatter, hideLabel }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }
  
  return (
    <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {!hideLabel && label && (
        <div className="font-medium">{label}</div>
      )}
      <div className="grid gap-1.5">
        {payload.map((entry, index) => {
          const value = formatter ? formatter(entry.value, entry.name, entry, index) : entry.value;
          return (
            <div key={`item-${index}`} className="flex flex-1 justify-between leading-none items-center">
              <div className="flex items-center gap-1.5">
                <div 
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function BarChartComponent({ data }: { data: ChartData }) {
  // Find the first series key for the bar chart
  const seriesKeys = Object.keys(data.chartConfig);
  const dataKey = seriesKeys.length > 0 ? 
    (data.chartConfig[seriesKeys[0]].dataKey || seriesKeys[0]) : "";
  
  // Function to format tooltip values if specified
  const formatTooltip = data.config.tooltipFormatter ? 
    new Function('value', 'name', 'entry', 'index', 'return ' + data.config.tooltipFormatter)() : 
    null;
  
  // Function to format Y axis values if specified
  const formatYAxis = data.config.yAxisFormatter ? 
    new Function('value', 'return ' + data.config.yAxisFormatter)() :
    (value) => value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{data.config.title}</CardTitle>
        {data.config.subtitle && (
          <CardDescription>{data.config.subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data.data}
              margin={data.config.margin || { top: 20, right: 30, bottom: 50, left: 60 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey={data.config.xAxisKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => {
                  return value?.length > 20
                    ? `${value.substring(0, 17)}...`
                    : value;
                }}
              >
                {data.config.xAxisLabel && (
                  <Label 
                    value={data.config.xAxisLabel} 
                    position="bottom" 
                    offset={20}
                    style={{ textAnchor: 'middle', fill: '#888' }} 
                  />
                )}
              </XAxis>
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              >
                {data.config.yAxisLabel && (
                  <Label 
                    value={data.config.yAxisLabel} 
                    angle={-90} 
                    position="left"
                    offset={-40}
                    style={{ textAnchor: 'middle', fill: '#888' }} 
                  />
                )}
              </YAxis>
              <Tooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                content={<CustomTooltip formatter={formatTooltip} hideLabel={!data.config.tooltipShowLabel} />}
              />
              <Bar
                dataKey={dataKey}
                name={data.chartConfig[seriesKeys[0]]?.name || seriesKeys[0]}
                fill={data.chartConfig[seriesKeys[0]]?.color || "#3366CC"}
                radius={[4, 4, 0, 0]}
              />
              {data.config.legendPosition && (
                <Legend 
                  verticalAlign={data.config.legendPosition === 'top' ? 'top' : 'bottom'}
                  align={data.config.legendPosition === 'right' ? 'right' : 
                        data.config.legendPosition === 'left' ? 'left' : 'center'}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {data.config.trend && (
          <div className="flex gap-2 font-medium leading-none">
            Trending {data.config.trend.direction} by{" "}
            {data.config.trend.percentage}% this period{" "}
            {data.config.trend.direction === "up" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
        )}
        {data.config.footer && (
          <div className="leading-none text-muted-foreground">
            {data.config.footer}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function MultiBarChartComponent({ data }: { data: ChartData }) {
  // Function to format tooltip values if specified
  const formatTooltip = data.config.tooltipFormatter ? 
    new Function('value', 'name', 'entry', 'index', 'return ' + data.config.tooltipFormatter)() : 
    null;
  
  // Function to format Y axis values if specified
  const formatYAxis = data.config.yAxisFormatter ? 
    new Function('value', 'return ' + data.config.yAxisFormatter)() :
    (value) => value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{data.config.title}</CardTitle>
        {data.config.subtitle && (
          <CardDescription>{data.config.subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data.data}
              margin={data.config.margin || { top: 20, right: 30, bottom: 50, left: 60 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey={data.config.xAxisKey}
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => {
                  return value?.length > 20
                    ? `${value.substring(0, 17)}...`
                    : value;
                }}
              >
                {data.config.xAxisLabel && (
                  <Label 
                    value={data.config.xAxisLabel} 
                    position="bottom" 
                    offset={20}
                    style={{ textAnchor: 'middle', fill: '#888' }} 
                  />
                )}
              </XAxis>
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              >
                {data.config.yAxisLabel && (
                  <Label 
                    value={data.config.yAxisLabel} 
                    angle={-90} 
                    position="left"
                    offset={-40}
                    style={{ textAnchor: 'middle', fill: '#888' }} 
                  />
                )}
              </YAxis>
              <Tooltip
                cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
                content={<CustomTooltip formatter={formatTooltip} hideLabel={!data.config.tooltipShowLabel} />}
              />
              {Object.keys(data.chartConfig).map((key, index) => (
                <Bar
                  key={key}
                  dataKey={data.chartConfig[key].dataKey || key}
                  name={data.chartConfig[key].name || key}
                  fill={data.chartConfig[key].color || `#${Math.floor(Math.random()*16777215).toString(16)}`}
                  radius={[4, 4, 0, 0]}
                  stackId={data.config.stacked ? "stack" : undefined}
                />
              ))}
              {data.config.legendPosition && (
                <Legend 
                  verticalAlign={data.config.legendPosition === 'top' ? 'top' : 'bottom'}
                  align={data.config.legendPosition === 'right' ? 'right' : 
                        data.config.legendPosition === 'left' ? 'left' : 'center'}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {data.config.trend && (
          <div className="flex gap-2 font-medium leading-none">
            Trending {data.config.trend.direction} by{" "}
            {data.config.trend.percentage}% this period{" "}
            {data.config.trend.direction === "up" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
        )}
        {data.config.footer && (
          <div className="leading-none text-muted-foreground">
            {data.config.footer}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function LineChartComponent({ data }: { data: ChartData }) {
  // Safely create formatter functions
  const formatTooltip = React.useMemo(() => {
    if (!data.config.tooltipFormatter) return null;
    
    return (value, name, entry, index) => {
      try {
        // Safe way to create a function from a string
        return Function('"use strict";return (' + data.config.tooltipFormatter + ')')()(value, name, entry, index);
      } catch (error) {
        console.error("Error with tooltip formatter:", error);
        return value;
      }
    };
  }, [data.config.tooltipFormatter]);
  
  const formatYAxis = React.useMemo(() => {
    if (!data.config.yAxisFormatter) return (value) => value;
    
    return (value) => {
      try {
        // Safe way to create a function from a string
        return Function('"use strict";return (' + data.config.yAxisFormatter + ')')()(value);
      } catch (error) {
        console.error("Error with Y axis formatter:", error);
        return value;
      }
    };
  }, [data.config.yAxisFormatter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{data.config.title}</CardTitle>
        {data.config.subtitle && (
          <CardDescription>{data.config.subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data.data}
              margin={data.config.margin || { top: 20, right: 30, bottom: 50, left: 60 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey={data.config.xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  return value?.length > 20
                    ? `${value.substring(0, 17)}...`
                    : value;
                }}
              >
                {data.config.xAxisLabel && (
                  <Label 
                    value={data.config.xAxisLabel} 
                    position="bottom" 
                    offset={20}
                    style={{ textAnchor: 'middle', fill: '#888' }} 
                  />
                )}
              </XAxis>
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              >
                {data.config.yAxisLabel && (
                  <Label 
                    value={data.config.yAxisLabel} 
                    angle={-90} 
                    position="left"
                    offset={-40}
                    style={{ textAnchor: 'middle', fill: '#888' }} 
                  />
                )}
              </YAxis>
              <Tooltip
                cursor={{ stroke: 'rgba(0, 0, 0, 0.3)', strokeWidth: 1, strokeDasharray: '5 5' }}
                formatter={formatTooltip || undefined}
              />
              {Object.keys(data.chartConfig).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={data.chartConfig[key].dataKey || key}
                  name={data.chartConfig[key].name || key}
                  stroke={data.chartConfig[key].color || "#3366CC"}
                  strokeWidth={data.chartConfig[key].strokeWidth || 2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              ))}
              {data.config.legendPosition && (
                <Legend 
                  verticalAlign={data.config.legendPosition === 'top' ? 'top' : 'bottom'}
                  align={data.config.legendPosition === 'right' ? 'right' : 
                        data.config.legendPosition === 'left' ? 'left' : 'center'}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        {data.config.trend && (
          <div className="flex gap-2 font-medium leading-none">
            Trending {data.config.trend.direction} by{" "}
            {data.config.trend.percentage}% this period{" "}
            {data.config.trend.direction === "up" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
        )}
        {data.config.footer && (
          <div className="leading-none text-muted-foreground">
            {data.config.footer}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function PieChartComponent({ data }: { data: ChartData }) {
  const totalValue = React.useMemo(() => {
    return data.data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data.data]);

  // Function to format tooltip values if specified
  const formatTooltip = data.config.tooltipFormatter ? 
    new Function('value', 'name', 'entry', 'index', 'return ' + data.config.tooltipFormatter)() : 
    null;

  // Generate colors for each slice if not provided
  const chartData = data.data.map((item, index) => {
    const colorPalette = [
      "#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", 
      "#0099C6", "#DD4477", "#66AA00", "#B82E2E", "#316395"
    ];
    
    return {
      ...item,
      fill: colorPalette[index % colorPalette.length]
    };
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-xl">{data.config.title}</CardTitle>
        {data.config.subtitle && (
          <CardDescription>{data.config.subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <div className="mx-auto aspect-square max-h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={data.config.margin || { top: 20, right: 30, bottom: 30, left: 30 }}>
              <Tooltip
                content={<CustomTooltip formatter={formatTooltip} hideLabel={!data.config.tooltipShowLabel} />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="segment"
                innerRadius={60}
                outerRadius="80%"
                paddingAngle={2}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                <Label
                  position="center"
                  content={() => (
                    <text
                      x="50%"
                      y="50%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground"
                    >
                      <tspan x="50%" y="45%" className="text-2xl font-bold">
                        {totalValue.toLocaleString()}
                      </tspan>
                      <tspan x="50%" y="65%" className="text-sm fill-muted-foreground">
                        {data.config.totalLabel || "Total"}
                      </tspan>
                    </text>
                  )}
                />
              </Pie>
              {data.config.legendPosition && (
                <Legend 
                  verticalAlign={data.config.legendPosition === 'top' ? 'top' : 'bottom'}
                  align={data.config.legendPosition === 'right' ? 'right' : 
                        data.config.legendPosition === 'left' ? 'left' : 'center'}
                />
              )}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {data.config.trend && (
          <div className="flex items-center gap-2 font-medium leading-none">
            Trending {data.config.trend.direction} by{" "}
            {data.config.trend.percentage}% this period{" "}
            {data.config.trend.direction === "up" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
        )}
        {data.config.footer && (
          <div className="leading-none text-muted-foreground">
            {data.config.footer}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

function AreaChartComponent({
  data,
  stacked,
}: {
  data: ChartData;
  stacked?: boolean;
}) {
  // Function to format tooltip values if specified
  const formatTooltip = data.config.tooltipFormatter ? 
    new Function('value', 'name', 'entry', 'index', 'return ' + data.config.tooltipFormatter)() : 
    null;
  
  // Function to format Y axis values if specified
  const formatYAxis = data.config.yAxisFormatter ? 
    new Function('value', 'return ' + data.config.yAxisFormatter)() :
    (value) => value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{data.config.title}</CardTitle>
        {data.config.subtitle && (
          <CardDescription>{data.config.subtitle}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="aspect-video w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data.data}
              margin={data.config.margin || { top: 20, right: 30, bottom: 50, left: 60 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey={data.config.xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  return value?.length > 20
                    ? `${value.substring(0, 17)}...`
                    : value;
                }}
              >
                {data.config.xAxisLabel && (
                  <Label 
                    value={data.config.xAxisLabel} 
                    position="bottom" 
                    offset={20}
                    style={{ textAnchor: 'middle', fill: '#888' }} 
                  />
                )}
              </XAxis>
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              >
                {data.config.yAxisLabel && (
                  <Label 
                    value={data.config.yAxisLabel} 
                    angle={-90} 
                    position="left"
                    offset={-40}
                    style={{ textAnchor: 'middle', fill: '#888' }} 
                  />
                )}
              </YAxis>
              <Tooltip
                content={<CustomTooltip formatter={formatTooltip} hideLabel={!data.config.tooltipShowLabel} />}
              />
              {Object.keys(data.chartConfig).map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={data.chartConfig[key].dataKey || key}
                  name={data.chartConfig[key].name || key}
                  fill={data.chartConfig[key].color || `#${Math.floor(Math.random()*16777215).toString(16)}`}
                  stroke={data.chartConfig[key].color || `#${Math.floor(Math.random()*16777215).toString(16)}`}
                  fillOpacity={data.chartConfig[key].fillOpacity || 0.3}
                  stackId={stacked ? "stack" : undefined}
                />
              ))}
              {data.config.legendPosition && (
                <Legend 
                  verticalAlign={data.config.legendPosition === 'top' ? 'top' : 'bottom'}
                  align={data.config.legendPosition === 'right' ? 'right' : 
                        data.config.legendPosition === 'left' ? 'left' : 'center'}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            {data.config.trend && (
              <div className="flex items-center gap-2 font-medium leading-none">
                Trending {data.config.trend.direction} by{" "}
                {data.config.trend.percentage}% this period{" "}
                {data.config.trend.direction === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
            )}
            {data.config.footer && (
              <div className="leading-none text-muted-foreground">
                {data.config.footer}
              </div>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function ChartRenderer({ data }: { data: ChartData }) {
  // Add a safety check to handle null/undefined data
  if (!data || !data.chartType) {
    console.warn("Invalid chart data provided to ChartRenderer");
    return null;
  }

  // Log the chart data to help with debugging
  console.log(`Rendering chart of type: ${data.chartType} with ${data.data?.length || 0} data points`);
  
  switch (data.chartType) {
    case "bar":
      return <BarChartComponent data={data} />;
    case "multiBar":
    case "multibar":
      return <MultiBarChartComponent data={data} />;
    case "line":
      return <LineChartComponent data={data} />;
    case "pie":
      return <PieChartComponent data={data} />;
    case "area":
      return <AreaChartComponent data={data} />;
    case "stackedArea":
    case "stackedarea":
      return <AreaChartComponent data={data} stacked />;
    default:
      console.warn(`Unknown chart type: ${data.chartType}`);
      // Fallback to bar chart for unknown types
      return <BarChartComponent data={data} />;
  }
}