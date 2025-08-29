#!/usr/bin/env python3
"""
Profile API script for AutoQuanta
Provides data profiling functionality via command line interface
"""

import os
import sys
import json
import argparse
from pathlib import Path
import numpy as np


def convert_numpy_types(obj):
    """Convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(v) for v in obj]
    return obj

# Add the Analysis directory to the path
project_root = Path(__file__).parent
analysis_path = project_root / 'Analysis'
sys.path.insert(0, str(analysis_path))

from Analysis.core.profiler import DataProfiler
from Analysis.utils.data_structures import DataProfile


def profile_csv(csv_path: str) -> dict:
    """Profile a CSV file and return results as dictionary."""
    try:
        # Create profiler and profile the data
        profiler = DataProfiler()
        profile = profiler.profile_csv(csv_path)
        
        # Convert profile to dictionary for JSON serialization
        profile_dict = convert_numpy_types({
            'success': True,
            'profile': {
                'file_path': profile.file_path,
                'shape': profile.shape,
                'memory_usage_mb': profile.memory_usage_mb,
                'columns': [
                    {
                        'name': col.name,
                        'dtype': col.dtype,
                        'missing_count': col.missing_count,
                        'missing_percentage': col.missing_percentage,
                        'unique_count': col.unique_count,
                        'unique_percentage': col.unique_percentage,
                        'memory_usage': col.memory_usage,
                        'stats': col.stats,
                        'warnings': col.warnings
                    }
                    for col in profile.columns
                ],
                'missing_summary': profile.missing_summary,
                'dtypes_summary': profile.dtypes_summary,
                'warnings': profile.warnings
            }
        })
        
        # Generate visualization data
        viz_data = profiler.generate_visualization_data(profile)
        profile_dict['profile']['visualization_data'] = viz_data
        
        # Generate recommendations
        recommendations = profiler.get_column_recommendations(profile)
        profile_dict['profile']['recommendations'] = recommendations
        
        return profile_dict
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Profile CSV data')
    parser.add_argument('csv_path', help='Path to the CSV file to profile')
    
    args = parser.parse_args()
    
    # Profile the CSV
    result = profile_csv(args.csv_path)
    
    # Output JSON result
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()