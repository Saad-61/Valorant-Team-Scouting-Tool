// Automated Scouting Report Generator Page
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AnalyticsCard } from '../components/ui/AnalyticsCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { TeamSelector } from '../components/ui/TeamSelector';
import { TeamRequiredPrompt } from '../components/ui/TeamRequiredPrompt';
import { cn } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  FileText, Download, Trophy, Target, Users, Map as MapIcon, Shield,
  AlertTriangle, TrendingUp, TrendingDown, Crosshair, Zap,
  Eye, Brain, Swords, Clock, ChevronDown, ChevronRight,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Role colors
const ROLE_COLORS = {
  Controller: '#10B981',
  Initiator: '#F59E0B',
  Sentinel: '#3B82F6',
  Duelist: '#EF4444',
};

export function ScoutingReportPage() {
  const { filters, setFilter } = useAppStore();
  const [teams, setTeams] = useState([]);
  const [scoutData, setScoutData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatInsights, setChatInsights] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    mapPool: true,
    compositions: true,
    players: true,
    weaknesses: true,
    strategies: true,
  });
  const reportRef = useRef(null);

  // Load chat insights from localStorage on mount
  useEffect(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    if (storedMessages) {
      try {
        const messages = JSON.parse(storedMessages);
        // Filter for assistant responses about the current team
        const insights = messages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .reduce((acc, msg, idx, arr) => {
            if (msg.role === 'user' && arr[idx + 1]?.role === 'assistant') {
              acc.push({
                question: msg.content,
                answer: arr[idx + 1].content,
                timestamp: msg.timestamp
              });
            }
            return acc;
          }, []);
        setChatInsights(insights);
      } catch (e) {
        console.error('Failed to load chat insights:', e);
      }
    }
  }, []);

  // Fetch teams
  useEffect(() => {
    api.getTeams().then(res => setTeams(res.data || []));
  }, []);

  // Fetch full scouting data when team changes
  useEffect(() => {
    if (!filters.team) {
      setScoutData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    api.getFullScoutingData(filters.team)
      .then(res => {
        console.log('Scout API Raw Response:', res);
        // API response: { team_name, num_matches, data: { overview, players, etc } }
        // getFullScoutingData does .then(res => res.data), so res = { team_name, num_matches, data: {...} }
        // The actual scouting data is in res.data
        const scoutingData = res?.data;
        
        if (!scoutingData) {
          setError('No scouting data available');
          setScoutData(null);
        } else {
          setScoutData(scoutingData);
        }
      })
      .catch(err => {
        console.error('Scout data fetch error:', err);
        setError(`Failed to load scouting data: ${err.message}`);
        setScoutData(null);
      })
      .finally(() => setLoading(false));
  }, [filters.team]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Export report as text/markdown with AI generation
  const exportReport = async () => {
    if (!scoutData || !filters.team) return;

    try {
      setLoading(true);
      
      // Generate AI-powered report with chat insights
      const reportData = await api.generateReport(
        filters.team, 
        10, 
        chatInsights.slice(-10) // Last 10 Q&As
      );
      
      const report = reportData.report || generateTextReport();
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filters.team}_scouting_report.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report generation error:', err);
      // Fallback to basic report
      const report = generateTextReport();
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filters.team}_scouting_report.md`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  // Generate text report
  const generateTextReport = () => {
    const { overview, compositions, pistol_rounds, players, round_patterns, weapon_economy, weaknesses } = scoutData;
    
    let report = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `                    CLOUD9 VALORANT - SCOUTING REPORT\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `📋 OPPONENT: ${filters.team.toUpperCase()}\n`;
    report += `📅 Report Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    report += `⏰ Time: ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    // Executive Summary
    report += `## 📊 EXECUTIVE SUMMARY\n\n`;
    report += `This comprehensive scouting report provides tactical analysis of ${filters.team}'s recent performance, `;
    report += `including strategic tendencies, player capabilities, and exploitable weaknesses. `;
    report += `The data is derived from ${overview?.map_stats?.reduce((sum, m) => sum + (m.games || 0), 0) || 'multiple'} recent matches `;
    report += `across ${overview?.map_stats?.length || 0} different maps.\n\n`;
    
    // Overview
    report += `### 🎯 Performance Metrics\n\n`;
    const winRate = overview?.win_rate || 0;
    const performance = winRate >= 60 ? 'exceptional' : winRate >= 50 ? 'solid' : winRate >= 40 ? 'inconsistent' : 'struggling';
    report += `${filters.team} has demonstrated ${performance} performance with an overall win rate of **${winRate.toFixed(1)}%** `;
    report += `(${overview?.series_record || 'N/A'}). `;
    
    if (winRate >= 50) {
      report += `This above-average win rate indicates a well-coordinated team that poses a significant threat. `;
      report += `Expect disciplined executes and strong fundamentals.\n\n`;
    } else {
      report += `This below-average win rate suggests vulnerabilities we can exploit through aggressive early-round pressure `;
      report += `and map control denial.\n\n`;
    }
    
    // Map Pool
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `## 🗺️ MAP POOL ANALYSIS\n\n`;
    
    if (overview?.map_stats && overview.map_stats.length > 0) {
      report += `${filters.team} has shown activity across ${overview.map_stats.length} maps. Below is a detailed breakdown `;
      report += `of their map-specific performance:\n\n`;
      
      const sortedMaps = [...overview.map_stats].sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));
      
      sortedMaps.forEach((map, idx) => {
        const strength = map.win_rate >= 60 ? '🔥 COMFORT PICK' : map.win_rate >= 50 ? '✅ PLAYABLE' : map.win_rate >= 40 ? '⚠️ VULNERABLE' : '❌ BAN TARGET';
        report += `### ${map.map.toUpperCase()} ${strength}\n\n`;
        report += `**Performance Overview:**\n`;
        report += `- Sample Size: ${map.games} games played\n`;
        report += `- Win Rate: ${(map.win_rate || 0).toFixed(1)}% (${map.wins} wins, ${map.games - map.wins} losses)\n`;
        report += `- Average Round Differential: ${(map.avg_round_diff || 0) >= 0 ? '+' : ''}${(map.avg_round_diff || 0).toFixed(1)} rounds\n\n`;
        
        report += `**Tactical Assessment:**\n`;
        if (map.win_rate >= 60) {
          report += `${filters.team} excels on ${map.map}, showing strong map knowledge and set strategies. This is likely a `;
          report += `first-pick map for them. Consider banning this map or preparing counter-strategies specifically for it. `;
          report += `Expect well-rehearsed executes and defensive setups.\n\n`;
        } else if (map.win_rate >= 50) {
          report += `${filters.team} is competent on ${map.map} but not dominant. This map is winnable with proper preparation. `;
          report += `Focus on denying their preferred site takes and forcing them into uncomfortable positions.\n\n`;
        } else if (map.win_rate >= 40) {
          report += `${filters.team} struggles on ${map.map}. This represents an opportunity for us. Their average round differential `;
          report += `of ${(map.avg_round_diff || 0).toFixed(1)} suggests they often keep games close but fail to close out. Target this map `;
          report += `if it remains in the pool.\n\n`;
        } else {
          report += `${filters.team} has significant weakness on ${map.map}. This should be a priority pick or force for us. `;
          report += `Their poor win rate indicates fundamental issues with either map understanding or agent composition. `;
          report += `Apply early pressure to expose these weaknesses.\n\n`;
        }
      });
      
      report += `**Map Veto Recommendation:**\n`;
      const bestMap = sortedMaps[0];
      const worstMap = sortedMaps[sortedMaps.length - 1];
      report += `- EXPECT THEM TO PICK: ${bestMap.map.toUpperCase()} (${bestMap.win_rate.toFixed(1)}% WR)\n`;
      report += `- RECOMMEND WE PICK: ${worstMap.map.toUpperCase()} (${worstMap.win_rate.toFixed(1)}% WR)\n`;
      report += `- MAP POOL DEPTH: ${sortedMaps.filter(m => m.win_rate >= 50).length}/${sortedMaps.length} maps above 50% WR\n\n`;
    } else {
      report += `Limited map data available for ${filters.team}.\n\n`;
    }
    
    // Agent Compositions
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `## 🎭 AGENT COMPOSITION ANALYSIS\n\n`;
    
    if (compositions?.agent_picks && compositions.agent_picks.length > 0) {
      report += `${filters.team} shows clear agent preferences that reveal their strategic approach. Understanding these picks `;
      report += `allows us to predict their gameplan and prepare appropriate counters.\n\n`;
      
      report += `### Primary Agent Pool\n\n`;
      compositions.agent_picks.slice(0, 6).forEach((agent, idx) => {
        const emoji = { Controller: '🌫️', Initiator: '⚡', Sentinel: '🛡️', Duelist: '⚔️' }[agent.role] || '🎯';
        report += `${idx + 1}. **${agent.agent.toUpperCase()}** ${emoji} (${agent.role})\n`;
        report += `   - Pick Rate: ${(agent.pick_rate || 0).toFixed(1)}%\n`;
        report += `   - Games Played: ${agent.games || 0}\n`;
        
        if (agent.pick_rate >= 70) {
          report += `   - Status: CORE PICK - Essential to their composition, expect this almost every match\n\n`;
        } else if (agent.pick_rate >= 50) {
          report += `   - Status: FREQUENT PICK - Regularly played, part of their standard rotation\n\n`;
        } else {
          report += `   - Status: SITUATIONAL - Map or matchup dependent pick\n\n`;
        }
      });
      
      // Role distribution analysis
      if (compositions.role_distribution) {
        report += `### Role Distribution Breakdown\n\n`;
        report += `Understanding ${filters.team}'s role preferences reveals their fundamental playstyle:\n\n`;
        
        const roles = Object.entries(compositions.role_distribution).sort((a, b) => b[1] - a[1]);
        roles.forEach(([role, percentage]) => {
          const emoji = { Controller: '🌫️', Initiator: '⚡', Sentinel: '🛡️', Duelist: '⚔️' }[role] || '🎯';
          report += `- ${emoji} **${role}**: ${percentage.toFixed(1)}% of team composition\n`;
        });
        report += `\n`;
        
        const duelistPct = compositions.role_distribution.Duelist || 0;
        const controllerPct = compositions.role_distribution.Controller || 0;
        const sentinelPct = compositions.role_distribution.Sentinel || 0;
        
        report += `**Playstyle Assessment:**\n`;
        if (duelistPct >= 35) {
          report += `High duelist presence (${duelistPct.toFixed(0)}%) indicates an aggressive, entry-focused team. Expect fast executes `;
          report += `and early map control challenges. Counter with utility denial and crossfire setups.\n\n`;
        } else if (controllerPct >= 30) {
          report += `Heavy controller usage (${controllerPct.toFixed(0)}%) suggests a methodical, smoke-heavy approach. They likely rely on `;
          report += `vision denial for site takes. Prioritize smoke lineup disruption and off-angle positioning.\n\n`;
        } else if (sentinelPct >= 30) {
          report += `Sentinel-heavy compositions (${sentinelPct.toFixed(0)}%) indicate a defensive, site-anchor focused team. Expect strong retakes `;
          report += `and turtle strategies. Apply early pressure before setups are established.\n\n`;
        } else {
          report += `Balanced role distribution suggests versatile strategies. They adapt compositions to map and opponent. `;
          report += `Maintain flexible anti-strat preparation.\n\n`;
        }
      }
    } else {
      report += `Limited agent composition data available.\n\n`;
    }
    
    // Weaknesses (Critical Section)
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `## ⚠️ EXPLOITABLE WEAKNESSES (HIGH PRIORITY)\n\n`;
    
    const weaknessList = weaknesses?.weaknesses || [];
    if (weaknessList.length > 0) {
      report += `Through detailed match analysis, we have identified ${weaknessList.length} key weakness${weaknessList.length > 1 ? 'es' : ''} `;
      report += `that can be exploited for tactical advantage:\n\n`;
      
      weaknessList.forEach((w, i) => {
        const severityEmoji = {
          'HIGH': '🔴',
          'MEDIUM': '🟡',
          'LOW': '🟢'
        }[w.severity?.toUpperCase()] || '🟡';
        
        report += `### ${severityEmoji} WEAKNESS #${i + 1}: ${(w.category || w.area || 'Strategic Weakness').toUpperCase()}\n\n`;
        report += `**Severity Level:** ${(w.severity || 'Medium').toUpperCase()}\n\n`;
        
        report += `**Identified Issue:**\n`;
        report += `${w.finding || 'No specific finding available'}\n\n`;
        
        if (w.details) {
          report += `**Detailed Analysis:**\n`;
          const details = Array.isArray(w.details) ? w.details : [w.details];
          details.forEach(detail => {
            report += `- ${detail}\n`;
          });
          report += `\n`;
        }
        
        report += `**🎯 Recommended Exploitation Strategy:**\n`;
        report += `${w.recommendation || 'Prepare specific counter-strategies targeting this weakness'}\n\n`;
        
        if (w.severity?.toUpperCase() === 'HIGH') {
          report += `⚡ **PRIORITY TARGET** - This weakness should be central to our gameplan. Build strategies specifically designed `;
          report += `to force ${filters.team} into situations that expose this vulnerability.\n\n`;
        }
        
        report += `---\n\n`;
      });
    } else {
      report += `No critical weaknesses identified through current data analysis. ${filters.team} demonstrates solid fundamentals `;
      report += `across all measured categories. Victory will require execution excellence and mid-round adaptation.\n\n`;
      report += `**Recommended Approach:**\n`;
      report += `- Focus on out-aiming in key duels\n`;
      report += `- Win the economy war through early picks\n`;
      report += `- Force overtime scenarios where mental fortitude becomes decisive\n\n`;
    }
    
    // Player Profiles
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `## 👥 PLAYER PROFILES & THREAT ASSESSMENT\n\n`;
    
    const playerList = players?.players || [];
    if (playerList.length > 0) {
      report += `Individual player analysis is crucial for understanding ${filters.team}'s tactical tendencies. Below are detailed `;
      report += `profiles of their active roster:\n\n`;
      
      const sortedPlayers = [...playerList].sort((a, b) => (b.kd_ratio || b.kd || 0) - (a.kd_ratio || a.kd || 0));
      
      sortedPlayers.forEach((player, idx) => {
        const kd = player.kd_ratio || player.kd || 0;
        const threat = kd >= 1.2 ? '🔴 HIGH THREAT' : kd >= 1.0 ? '🟡 MODERATE THREAT' : '🟢 MANAGEABLE';
        
        report += `### ${idx + 1}. ${(player.name || player.player_name || 'Unknown').toUpperCase()} ${threat}\n\n`;
        
        report += `**Performance Statistics:**\n`;
        report += `- K/D Ratio: ${kd.toFixed(2)}\n`;
        report += `- Sample Size: ${player.games || 0} games analyzed\n`;
        report += `- Total Eliminations: ${player.kills || 0}\n`;
        report += `- Deaths: ${player.deaths || 0}\n`;
        report += `- Assists: ${player.assists || 0}\n`;
        report += `- KDA: ${player.kills || 0}/${player.deaths || 0}/${player.assists || 0}\n\n`;
        
        // Agent pool analysis
        if (player.agent_pool && player.agent_pool.length > 0) {
          report += `**Agent Specializations:**\n`;
          const agentList = player.agent_pool.slice(0, 5).map(a => {
            if (typeof a === 'object' && a.agent) {
              return `${a.agent} (${a.games || 0}g)`;
            }
            return a;
          }).join(', ');
          report += `${agentList}\n\n`;
        }
        
        report += `**Tactical Assessment:**\n`;
        if (kd >= 1.3) {
          report += `⚠️ **STAR PLAYER** - ${player.name || player.player_name} is a franchise player with exceptional fragging ability. `;
          report += `This is their primary win condition. Priority target for utility usage and trade setups. Denying space to this player `;
          report += `significantly reduces ${filters.team}'s round win probability. Consider double-peeking this player and avoiding 1v1 duels.\n\n`;
        } else if (kd >= 1.1) {
          report += `Strong performer who consistently delivers positive impact. This player can take over rounds if given space. `;
          report += `Maintain disciplined crossfires and avoid giving them easy opening picks.\n\n`;
        } else if (kd >= 0.95) {
          report += `Reliable role player who fills their position adequately. Not a primary threat but capable of clutching `;
          report += `important rounds. Standard defensive protocols apply.\n\n`;
        } else {
          report += `⭐ **EXPLOIT OPPORTUNITY** - This player represents ${filters.team}'s weak link. Their K/D of ${kd.toFixed(2)} suggests `;
          report += `they struggle in aim duels. Identify their positioning patterns and force engagements through their side of the map. `;
          report += `Target them first in post-plant scenarios.\n\n`;
        }
        
        report += `---\n\n`;
      });
    } else {
      report += `Limited player-specific data available. Focus on team-level tendencies.\n\n`;
    }
    
    // Strategic Tendencies
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `## 🧠 STRATEGIC TENDENCIES & PATTERNS\n\n`;
    
    // Pistol Analysis
    if (pistol_rounds) {
      report += `### 🔫 Pistol Round Behavior\n\n`;
      report += `Pistol rounds set the economic pace of the game. ${filters.team}'s pistol performance reveals their confidence `;
      report += `in early-round gunfights:\n\n`;
      
      const attackPistol = pistol_rounds.attack_pistol?.win_rate || pistol_rounds.attack || 0;
      const defensePistol = pistol_rounds.defense_pistol?.win_rate || pistol_rounds.defense || 0;
      const overallPistol = pistol_rounds.overall_pistol_win_rate || 0;
      
      report += `**Performance Breakdown:**\n`;
      report += `- Attack Side Pistols: ${attackPistol.toFixed(1)}% win rate ${attackPistol >= 50 ? '✅' : '❌'}\n`;
      report += `- Defense Side Pistols: ${defensePistol.toFixed(1)}% win rate ${defensePistol >= 50 ? '✅' : '❌'}\n`;
      report += `- Overall Pistol Win Rate: ${overallPistol.toFixed(1)}%\n\n`;
      
      report += `**Tactical Implications:**\n`;
      if (attackPistol >= 55) {
        report += `${filters.team} excels at attacking pistols, suggesting aggressive util usage and confident aim dueling. `;
        report += `Expect aggressive pushes for map control. Counter with stacked sites and delay tactics to waste their utility.\n\n`;
      } else if (attackPistol < 45) {
        report += `Weak attacking pistol performance indicates hesitancy or poor coordination. Exploit this by taking aggressive `;
        report += `off-angles and contesting their default setups. This is a guaranteed economy advantage opportunity.\n\n`;
      }
      
      if (defensePistol >= 55) {
        report += `Strong defensive pistols suggest disciplined positioning and effective crossfires. Avoid rushing blindly. `;
        report += `Use utility to clear common angles before committing.\n\n`;
      } else if (defensePistol < 45) {
        report += `Vulnerable defensive pistols present an opportunity for fast aggression. Consider rush strategies to catch them `;
        report += `in suboptimal positions before they establish defensive setups.\n\n`;
      }
    }
    
    // Round Patterns
    if (round_patterns) {
      report += `### ⚡ Round Win Conditions\n\n`;
      report += `Understanding how ${filters.team} typically wins rounds allows us to deny their win conditions:\n\n`;
      
      if (round_patterns.elimination_rate) {
        report += `**Team Fight Success Rate:** ${round_patterns.elimination_rate.toFixed(1)}%\n`;
      }
      if (round_patterns.post_plant_conversion) {
        report += `**Post-Plant Conversion:** ${round_patterns.post_plant_conversion.toFixed(1)}%\n\n`;
      }
      
      const attackPatterns = round_patterns.win_conditions?.attack || [];
      const defensePatterns = round_patterns.win_conditions?.defense || [];
      
      if (attackPatterns.length > 0) {
        report += `**Attack Side Win Conditions:**\n`;
        attackPatterns.slice(0, 3).forEach(p => {
          report += `- ${p.condition}: ${(p.percentage || 0).toFixed(1)}% of attack wins\n`;
        });
        report += `\n`;
      }
      
      if (defensePatterns.length > 0) {
        report += `**Defense Side Win Conditions:**\n`;
        defensePatterns.slice(0, 3).forEach(p => {
          report += `- ${p.condition}: ${(p.percentage || 0).toFixed(1)}% of defense wins\n`;
        });
        report += `\n`;
      }
    }
    
    // Economy & Weapons
    if (weapon_economy?.weapon_usage && weapon_economy.weapon_usage.length > 0) {
      report += `### 💰 Weapon Economy Preferences\n\n`;
      report += `${filters.team}'s weapon choices reveal their economic decision-making and aim confidence:\n\n`;
      
      weapon_economy.weapon_usage.slice(0, 5).forEach((weapon, idx) => {
        report += `${idx + 1}. **${weapon.weapon.toUpperCase()}**: ${weapon.kills || 0} eliminations\n`;
      });
      report += `\n`;
    }
    
    // Final Recommendations
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `## 🎯 MATCH PREPARATION SUMMARY\n\n`;
    
    report += `### Key Takeaways for Match Day:\n\n`;
    
    // Generate dynamic recommendations based on data
    const recommendations = [];
    
    if (overview?.map_stats) {
      const worstMap = [...overview.map_stats].sort((a, b) => a.win_rate - b.win_rate)[0];
      if (worstMap && worstMap.win_rate < 45) {
        recommendations.push(`📌 **MAP VETO**: Force ${worstMap.map.toUpperCase()} where they have only ${worstMap.win_rate.toFixed(0)}% win rate`);
      }
    }
    
    if (weaknessList.length > 0) {
      const highSevWeakness = weaknessList.find(w => w.severity?.toUpperCase() === 'HIGH');
      if (highSevWeakness) {
        recommendations.push(`📌 **PRIMARY STRATEGY**: ${highSevWeakness.finding}`);
      }
    }
    
    if (pistol_rounds) {
      const attackPistol = pistol_rounds.attack_pistol?.win_rate || 0;
      const defensePistol = pistol_rounds.defense_pistol?.win_rate || 0;
      if (attackPistol < 45) {
        recommendations.push(`📌 **PISTOL FOCUS**: Attack pistols are weak (${attackPistol.toFixed(0)}%) - be aggressive`);
      }
      if (defensePistol < 45) {
        recommendations.push(`📌 **PISTOL FOCUS**: Defense pistols are weak (${defensePistol.toFixed(0)}%) - fast rush strategies viable`);
      }
    }
    
    if (playerList.length > 0) {
      const topFragger = [...playerList].sort((a, b) => (b.kd_ratio || b.kd || 0) - (a.kd_ratio || a.kd || 0))[0];
      const bottomFragger = [...playerList].sort((a, b) => (a.kd_ratio || a.kd || 0) - (b.kd_ratio || b.kd || 0))[0];
      if (topFragger && (topFragger.kd_ratio || topFragger.kd) >= 1.2) {
        recommendations.push(`📌 **PLAYER FOCUS**: Target ${topFragger.name || topFragger.player_name} (${(topFragger.kd_ratio || topFragger.kd).toFixed(2)} KD) with utility`);
      }
      if (bottomFragger && (bottomFragger.kd_ratio || bottomFragger.kd) < 0.95) {
        recommendations.push(`📌 **EXPLOIT WEAKNESS**: Attack through ${bottomFragger.name || bottomFragger.player_name}'s position (${(bottomFragger.kd_ratio || bottomFragger.kd).toFixed(2)} KD)`);
      }
    }
    
    if (recommendations.length > 0) {
      recommendations.forEach(rec => report += `${rec}\n\n`);
    } else {
      report += `📌 **APPROACH**: ${filters.team} shows balanced performance. Focus on fundamental execution and mid-round adaptation.\n\n`;
    }
    
    report += `### Coach Notes:\n\n`;
    report += `- Review VODs focusing on their ${overview?.map_stats?.[0]?.map || 'main'} executes\n`;
    report += `- Prepare anti-strats for their ${compositions?.agent_picks?.[0]?.agent || 'signature'} compositions\n`;
    report += `- Practice trade scenarios against their ${playerList[0]?.name || 'star player'}\n`;
    report += `- Drill weak-side rotations to exploit timing windows\n\n`;
    
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `**Report Confidence:** ${playerList.length > 0 && overview?.map_stats?.length > 0 ? 'HIGH' : 'MEDIUM'} | `;
    report += `**Data Sources:** ${overview?.map_stats?.reduce((sum, m) => sum + m.games, 0) || 0} games analyzed\n\n`;
    report += `*This report was generated by Cloud9 VALORANT Scouting System*\n`;
    report += `*For coaching staff use only - Confidential*\n\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    return report;
  };

  // Section header component
  const SectionHeader = ({ title, icon: Icon, section, color = 'c9-500' }) => (
    <button
      onClick={() => toggleSection(section)}
      className={cn(
        'w-full flex items-center justify-between p-4 rounded-lg',
        'bg-[var(--surface-secondary)] border border-[var(--border-primary)]',
        'hover:bg-[var(--surface-tertiary)] transition-colors'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}/20`}>
          <Icon className={`w-5 h-5 text-${color}`} />
        </div>
        <span className="font-bold text-[var(--text-primary)]">{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
      ) : (
        <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
      )}
    </button>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-c9-500/20">
            <FileText className="w-6 h-6 text-c9-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Scouting Report Generator</h1>
            <p className="text-sm text-[var(--text-secondary)]">Automated tactical analysis for match preparation</p>
          </div>
        </div>
        <TeamSelector
          teams={teams}
          value={filters.team}
          onChange={(team) => setFilter('team', team)}
          placeholder="Select team to scout..."
          className="w-64"
        />
      </motion.div>

      {/* No team selected */}
      {!filters.team ? (
        <TeamRequiredPrompt 
          title="Automated Scouting Report"
          subtitle="Select a team above to generate a comprehensive scouting report including strategies, compositions, weaknesses, and player tendencies."
        />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500" />
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-c9-500 opacity-20 h-16 w-16" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Generating Scouting Report</p>
            <p className="text-[var(--text-secondary)] text-sm">Analyzing {filters.team} data...</p>
          </div>
          <div className="w-64 h-1.5 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-c9-500 to-c9-400 rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="p-4 rounded-full bg-red-500/10">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Failed to Load Data</p>
            <p className="text-[var(--text-secondary)] text-sm">{error}</p>
          </div>
          <button
            onClick={() => {
              // Trigger a refetch by resetting and re-setting the team
              const currentTeam = filters.team;
              setFilter('team', null);
              setTimeout(() => setFilter('team', currentTeam), 100);
            }}
            className="px-4 py-2 bg-c9-500 text-white rounded-lg hover:bg-c9-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : !scoutData || !scoutData.overview ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="p-4 rounded-full bg-yellow-500/10">
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">No Data Available</p>
            <p className="text-[var(--text-secondary)] text-sm">No scouting data found for {filters.team}</p>
          </div>
        </div>
      ) : (
        <div ref={reportRef} className="space-y-6">
          {/* Export Button */}
          <motion.div variants={itemVariants} className="flex justify-end">
            <button
              onClick={exportReport}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-c9-500 text-white hover:bg-c9-600 transition-colors',
                'font-medium shadow-lg'
              )}
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsCard
              title="Overall Win Rate"
              value={`${scoutData.overview?.win_rate?.toFixed(1) || 0}%`}
              icon={Trophy}
              variant={scoutData.overview?.win_rate >= 50 ? 'success' : 'danger'}
              subtitle={scoutData.overview?.series_record || 'N/A'}
            />
            <AnalyticsCard
              title="Map Pool Size"
              value={scoutData.overview?.map_stats?.length || 0}
              icon={MapIcon}
              subtitle="Maps in rotation"
            />
            <AnalyticsCard
              title="Weaknesses Found"
              value={scoutData.weaknesses?.weaknesses?.length || 0}
              icon={AlertTriangle}
              variant={(scoutData.weaknesses?.weaknesses?.length || 0) > 0 ? 'warning' : 'success'}
              subtitle="Exploitable areas"
            />
            <AnalyticsCard
              title="Players Analyzed"
              value={scoutData.players?.players?.length || 0}
              icon={Users}
              subtitle="Active roster"
            />
          </motion.div>

          {/* Overview Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Team Overview" icon={Eye} section="overview" />
            {expandedSections.overview && (
              <div className="p-4 rounded-lg border bg-[var(--surface-primary)] border-[var(--border-primary)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-2">Recent Performance</h4>
                    <div className="space-y-2">
                      {scoutData.overview?.recent_series?.slice(0, 3).map((series, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--surface-secondary)]">
                          <span className="text-sm text-[var(--text-primary)]">{series.opponent}</span>
                          <span className={cn(
                            'text-sm font-bold',
                            series.result === 'W' ? 'text-green-400' : 'text-red-400'
                          )}>
                            {series.score}
                          </span>
                        </div>
                      )) || <span className="text-[var(--text-tertiary)]">No recent series data</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-2">Pistol Round Stats</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[var(--text-tertiary)]">Attack</span>
                          <span className={(scoutData.pistol_rounds?.attack_pistol?.win_rate || 0) >= 50 ? 'text-green-400' : 'text-red-400'}>
                            {(scoutData.pistol_rounds?.attack_pistol?.win_rate || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" 
                            style={{ width: `${scoutData.pistol_rounds?.attack_pistol?.win_rate || 0}%` }} 
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[var(--text-tertiary)]">Defense</span>
                          <span className={(scoutData.pistol_rounds?.defense_pistol?.win_rate || 0) >= 50 ? 'text-green-400' : 'text-red-400'}>
                            {(scoutData.pistol_rounds?.defense_pistol?.win_rate || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" 
                            style={{ width: `${scoutData.pistol_rounds?.defense_pistol?.win_rate || 0}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-2">Round Patterns</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Elimination Rate</span>
                        <span className="text-[var(--text-primary)]">{scoutData.round_patterns?.elimination_rate?.toFixed(1) || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Post-Plant Conv.</span>
                        <span className="text-[var(--text-primary)]">{scoutData.round_patterns?.post_plant_conversion?.toFixed(1) || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Map Pool Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Map Pool Analysis" icon={MapIcon} section="mapPool" />
            {expandedSections.mapPool && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scoutData.overview?.map_stats?.map((map, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-4 rounded-lg border',
                      'bg-[var(--surface-secondary)] border-[var(--border-primary)]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[var(--text-primary)] capitalize">{map.map}</span>
                      <span className={cn(
                        'text-lg font-bold',
                        map.win_rate >= 50 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {(map.win_rate || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mb-3">{map.games} games played</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Wins</span>
                        <span className="text-green-400">{map.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Avg Diff</span>
                        <span className={(map.avg_round_diff || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {map.avg_round_diff >= 0 ? '+' : ''}{(map.avg_round_diff || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )) || <div className="text-[var(--text-tertiary)]">No map data available</div>}
              </div>
            )}
          </motion.div>

          {/* Agent Compositions Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Agent Compositions" icon={Users} section="compositions" />
            {expandedSections.compositions && (
              <div className="p-4 rounded-lg border bg-[var(--surface-primary)] border-[var(--border-primary)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-3">Top Picked Agents</h4>
                    <div className="space-y-2">
                      {scoutData.compositions?.agent_picks?.slice(0, 6).map((agent, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--surface-secondary)]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{agent.agent}</span>
                            <span 
                              className="px-2 py-0.5 text-xs rounded"
                              style={{ backgroundColor: `${ROLE_COLORS[agent.role]}20`, color: ROLE_COLORS[agent.role] }}
                            >
                              {agent.role}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-c9-400">{agent.pick_rate?.toFixed(0)}%</span>
                        </div>
                      )) || <span className="text-[var(--text-tertiary)]">No agent data</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-3">Role Distribution</h4>
                    <div className="space-y-3">
                      {Object.entries(scoutData.compositions?.role_distribution || {}).map(([role, value]) => (
                        <div key={role}>
                          <div className="flex justify-between text-sm mb-1">
                            <span style={{ color: ROLE_COLORS[role] }}>{role}</span>
                            <span className="text-[var(--text-primary)]">{value?.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ width: `${value || 0}%`, backgroundColor: ROLE_COLORS[role] }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Weaknesses Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Identified Weaknesses" icon={AlertTriangle} section="weaknesses" color="yellow-500" />
            {expandedSections.weaknesses && (
              <div className="space-y-3">
                {(scoutData.weaknesses?.weaknesses?.length > 0) ? scoutData.weaknesses.weaknesses.map((weakness, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-4 rounded-lg border-l-4',
                      'bg-[var(--surface-secondary)]',
                      weakness.severity?.toUpperCase() === 'HIGH' ? 'border-l-red-500' :
                      weakness.severity?.toUpperCase() === 'MEDIUM' ? 'border-l-yellow-500' :
                      'border-l-blue-500'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[var(--text-primary)]">{weakness.category || weakness.area || `Weakness #${idx + 1}`}</span>
                      <span className={cn(
                        'px-2 py-1 text-xs rounded font-medium',
                        weakness.severity?.toUpperCase() === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                        weakness.severity?.toUpperCase() === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      )}>
                        {weakness.severity || 'Medium'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] mb-1 font-medium">{weakness.finding}</p>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">{Array.isArray(weakness.details) ? weakness.details.join('; ') : weakness.details}</p>
                    <div className="flex items-start gap-2 p-2 rounded bg-[var(--surface-tertiary)]">
                      <Brain className="w-4 h-4 text-c9-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-c9-400">{weakness.recommendation}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-4 rounded-lg bg-[var(--surface-secondary)] text-center text-[var(--text-secondary)]">
                    No significant weaknesses identified
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Player Profiles Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Player Profiles" icon={Crosshair} section="players" />
            {expandedSections.players && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scoutData.players?.players?.map((player, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-4 rounded-lg border',
                      'bg-[var(--surface-secondary)] border-[var(--border-primary)]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[var(--text-primary)]">{player.name || player.player_name}</span>
                      <span className={cn(
                        'text-lg font-bold',
                        (player.kd_ratio || player.kd || 0) >= 1 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {(player.kd_ratio || player.kd)?.toFixed(2) || 'N/A'} K/D
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-2">
                      {player.games} games • {player.kills}/{player.deaths}/{player.assists} KDA
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {player.agent_pool?.slice(0, 4).map((agentItem, aidx) => {
                        // Handle both object format {agent, role, games} and string format
                        const agentName = typeof agentItem === 'object' ? agentItem.agent : agentItem;
                        return (
                          <span
                            key={aidx}
                            className="px-2 py-1 text-xs rounded bg-[var(--surface-tertiary)] text-[var(--text-secondary)] capitalize"
                          >
                            {agentName}
                          </span>
                        );
                      }) || null}
                    </div>
                  </div>
                )) || <div className="text-[var(--text-tertiary)]">No player data available</div>}
              </div>
            )}
          </motion.div>

          {/* Strategies Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Strategic Analysis" icon={Brain} section="strategies" />
            {expandedSections.strategies && (
              <div className="p-4 rounded-lg border bg-[var(--surface-primary)] border-[var(--border-primary)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Weapon Economy
                    </h4>
                    <div className="space-y-2 text-sm">
                      {scoutData.weapon_economy?.weapon_usage?.slice(0, 4).map((weapon, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--surface-secondary)]">
                          <span className="text-[var(--text-primary)] capitalize">{weapon.weapon}</span>
                          <span className="text-[var(--text-tertiary)]">{weapon.kills || 0} kills</span>
                        </div>
                      )) || <span className="text-[var(--text-tertiary)]">No weapon data</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-red-400" />
                      Key Insights
                    </h4>
                    <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <div className="p-2 rounded bg-[var(--surface-secondary)]">
                        {(scoutData.pistol_rounds?.attack_pistol?.win_rate || 0) >= 50 
                          ? '✅ Strong attack pistol rounds - expect aggressive buys'
                          : '⚠️ Weak attack pistols - may play passive early rounds'}
                      </div>
                      <div className="p-2 rounded bg-[var(--surface-secondary)]">
                        {(scoutData.round_patterns?.post_plant?.[0]?.conversion_rate || 0) >= 50
                          ? '✅ Strong post-plant conversion - plays time well'
                          : '⚠️ Lower post-plant conversion - may struggle in clutches'}
                      </div>
                      <div className="p-2 rounded bg-[var(--surface-secondary)]">
                        {scoutData.overview?.map_stats?.length >= 5
                          ? '✅ Deep map pool - versatile team'
                          : '⚠️ Limited map pool - predictable vetoes'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default ScoutingReportPage;
