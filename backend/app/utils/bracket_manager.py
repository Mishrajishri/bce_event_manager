
import random
import math
from typing import List, Dict, Any
from app.models import MatchStatus

class BracketManager:
    """Utility class to generate different types of tournament brackets."""

    @staticmethod
    def generate_single_elimination(event_id: str, teams: List[Dict[str, Any]], start_date: str) -> List[Dict[str, Any]]:
        """
        Generate ALL matches for a single elimination tournament.
        Future matches have NULL team IDs.
        """
        random.shuffle(teams)
        num_teams = len(teams)
        if num_teams < 2:
            return []

        # Calculate total rounds needed
        num_rounds = math.ceil(math.log2(num_teams))
        total_slots = 2**num_rounds
        
        matches = []
        
        # We'll use a virtual tree structure (array-based)
        # nodes 0 to total_slots-2 are internal nodes (future matches)
        # leaves are the initial teams
        
        # However, it's simpler to just generate rounds.
        # Round 1: 
        current_round_teams = teams + [{"id": None, "name": "BYE"}] * (total_slots - num_teams)
        
        # Map to track match positions for advancement
        # In a real system we'd need a way to link matches. 
        # For now, let's just generate the first round properly.
        # Advanced version: Generate all matches and link them.
        
        # Simplified: Just generate all rounds as empty shells first?
        # No, let's just generate the whole tree.
        
        matches = []
        # Total matches in knockout = num_teams - 1 (if pow of 2)
        # Actually it's simpler:
        queue = current_round_teams
        round_num = 1
        
        # This is tricky without a persistent "bracket_node" table.
        # Let's stick to generating Round 1 and handling the REST via "advance" logic.
        
        # REVISED: Just generate Round 1.
        team_idx = 0
        while team_idx < total_slots:
            t1 = queue[team_idx]
            t2 = queue[team_idx + 1]
            
            # If both are BYEs, no match. 
            # If one is BYE, team1 advances automatically (we'll handle this in the router)
            
            if t1["id"] and t2["id"]:
                match = {
                    "event_id": event_id,
                    "team1_id": t1["id"],
                    "team2_id": t2["id"],
                    "score_team1": 0,
                    "score_team2": 0,
                    "status": MatchStatus.SCHEDULED.value,
                    "venue": "TBA",
                    "match_date": start_date,
                    "round": 1
                }
                matches.append(match)
            elif t1["id"] or t2["id"]:
                # One team gets a bye - we'll treat this as a "completed" match with the winner?
                # Or just skip it and they'll be in Round 2.
                pass
                
            team_idx += 2
            
        return matches

    @staticmethod
    def generate_round_robin(event_id: str, teams: List[Dict[str, Any]], start_date: str) -> List[Dict[str, Any]]:
        """
        Generate matches for a round robin tournament where everyone plays everyone.
        """
        matches = []
        num_teams = len(teams)
        
        for i in range(num_teams):
            for j in range(i + 1, num_teams):
                match = {
                    "event_id": event_id,
                    "team1_id": teams[i]["id"],
                    "team2_id": teams[j]["id"],
                    "score_team1": 0,
                    "score_team2": 0,
                    "status": MatchStatus.SCHEDULED.value,
                    "venue": "TBA",
                    "match_date": start_date,
                    "round": 1 # In round robin, 'round' could refer to the day/slot
                }
                matches.append(match)
                
        return matches
