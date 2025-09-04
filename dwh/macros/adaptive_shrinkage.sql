{% macro shrink_rate_adaptive(numer, denom, mu, k, usage_percentile, position) -%}
  -- Adaptive shrinkage based on usage tier and position
  WITH adaptive_k AS (
    SELECT 
      CASE
        -- Elite tier (top 10%): minimal shrinkage
        WHEN {{ usage_percentile }} >= 90 THEN {{ k }} * 0.3
        -- High tier (75-90%): reduced shrinkage  
        WHEN {{ usage_percentile }} >= 75 THEN {{ k }} * 0.5
        -- Average tier (50-75%): moderate reduction
        WHEN {{ usage_percentile }} >= 50 THEN {{ k }} * 0.8
        -- Backup tier (below 50%): increased shrinkage for QBs, normal for others
        WHEN {{ position }} = 'QB' THEN {{ k }} * 1.5
        ELSE {{ k }}
      END AS k_adjusted
  )
  SELECT
    CASE
      WHEN {{ denom }} IS NULL OR {{ denom }} = 0 THEN {{ mu }}
      ELSE (({{ numer }}::numeric) + ({{ mu }}::numeric * k_adjusted::numeric))
           / (({{ denom }}::numeric) + k_adjusted::numeric)
    END
  FROM adaptive_k
{%- endmacro %}

{% macro calculate_usage_percentile(usage_metric, position, season, week) -%}
  -- Calculate usage percentile within position group
  PERCENT_RANK() OVER (
    PARTITION BY {{ position }}, {{ season }}, {{ week }}
    ORDER BY {{ usage_metric }}
  ) * 100
{%- endmacro %}