-- Agent calls cost fractions of a cent (about $0.001 each). Four decimals would
-- round most of them to $0.0001 or $0.0000, so widen to six. A wider numeric
-- keeps every existing value as it is.
alter table public.usage_events alter column cost_usd type numeric(12, 6);
alter table public.agent_messages alter column cost_usd type numeric(12, 6);
