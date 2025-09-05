{% macro score_defense_points(scoring_alias, points_allowed, sacks, interceptions, fumble_recoveries, def_tds, special_tds, safeties, blocked_kicks) -%}
  {%- set prefix = scoring_alias + '.' if scoring_alias else '' -%}
  
  -- Calculate defense fantasy points using scoring weights
  -- Points allowed scoring (tiered system)
  (CASE 
    WHEN {{ points_allowed }} = 0 THEN 10
    WHEN {{ points_allowed }} BETWEEN 1 AND 6 THEN 7
    WHEN {{ points_allowed }} BETWEEN 7 AND 13 THEN 4
    WHEN {{ points_allowed }} BETWEEN 14 AND 20 THEN 1
    WHEN {{ points_allowed }} BETWEEN 21 AND 27 THEN 0
    WHEN {{ points_allowed }} BETWEEN 28 AND 34 THEN -1
    ELSE -4
  END)
  + (COALESCE({{ sacks }}, 0) * 1)
  + (COALESCE({{ interceptions }}, 0) * 2)
  + (COALESCE({{ fumble_recoveries }}, 0) * 2)
  + (COALESCE({{ def_tds }}, 0) * 6)
  + (COALESCE({{ special_tds }}, 0) * 6)
  + (COALESCE({{ safeties }}, 0) * 2)
  + (COALESCE({{ blocked_kicks }}, 0) * 2)
  
{%- endmacro %}
