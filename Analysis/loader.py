"""
Enhanced data loader for AutoQuanta ML engine.
Handles CSV loading with validation, error handling, and optimization for large files.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, Union
import logging

try:
    from .utils import (
        validate_file_path, 
        memory_usage_mb, 
        get_sample_data, 
        Timer,
        format_bytes,
        SUPPORTED_EXTENSIONS,
        DEFAULT_CONFIG
    )
except ImportError:
    from utils import (
        validate_file_path, 
        memory_usage_mb, 
        get_sample_data, 
        Timer,
        format_bytes,
        SUPPORTED_EXTENSIONS,
        DEFAULT_CONFIG
    )

logger = logging.getLogger(__name__)


class DataLoader:
    """Enhanced data loader with validation and auto-detection."""
    
    def __init__(self):
        pass
    
    def load_csv(self, 
                 file_path: Union[str, Path], 
                 encoding: str = 'utf-8',
                 delimiter: Optional[str] = None) -> pd.DataFrame:
        """Load CSV file with basic validation and auto-detection."""
        file_path = validate_file_path(file_path)
        
        # Check file extension
        if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file format: {file_path.suffix}. "
                f"Supported formats: {', '.join(SUPPORTED_EXTENSIONS)}"
            )
        
        # Get file size for logging
        file_size_mb = file_path.stat().st_size / (1024 * 1024)
        logger.info(f"Loading file: {file_path.name} ({file_size_mb:.1f} MB)")
        
        with Timer(f"Loading CSV: {file_path.name}"):
            try:
                # Auto-detect delimiter if not provided
                if delimiter is None:
                    delimiter = self._detect_delimiter(file_path)
                
                # Load the CSV
                df = pd.read_csv(file_path, encoding=encoding, sep=delimiter)
                
                logger.info(f"Loaded {len(df):,} rows × {len(df.columns)} columns")
                logger.info(f"Memory usage: {memory_usage_mb(df):.1f} MB")
                
                return df
                
            except pd.errors.EmptyDataError:
                raise ValueError("CSV file is empty")
            except pd.errors.ParserError as e:
                raise ValueError(f"Error parsing CSV file: {str(e)}")
            except UnicodeDecodeError:
                logger.warning(f"UTF-8 decoding failed, trying latin-1")
                return self.load_csv(file_path, encoding='latin-1', delimiter=delimiter)
    
    def _detect_delimiter(self, file_path: Path) -> str:
        """
        Auto-detect CSV delimiter by sampling the first few lines.
        """
        common_delimiters = [',', '\t', ';', '|']
        
        with open(file_path, 'r', encoding='utf-8') as f:
            sample_lines = [f.readline() for _ in range(5)]
        
        # Count occurrences of each delimiter
        delimiter_counts = {}
        for delimiter in common_delimiters:
            counts = [line.count(delimiter) for line in sample_lines if line.strip()]
            if counts and all(count == counts[0] for count in counts) and counts[0] > 0:
                delimiter_counts[delimiter] = counts[0]
        
        if delimiter_counts:
            # Return delimiter with highest consistent count
            return max(delimiter_counts.items(), key=lambda x: x[1])[0]
        
        # Default to comma
        logger.warning("Could not auto-detect delimiter, using comma")
        return ','
    

    
    def get_file_info(self, file_path: Union[str, Path]) -> Dict[str, Any]:
        file_path = validate_file_path(file_path)
        
        file_size = file_path.stat().st_size
        
        # Quick line count
        with open(file_path, 'r', encoding='utf-8') as f:
            line_count = sum(1 for _ in f)
        
        return {
            'file_path': str(file_path),
            'file_name': file_path.name,
            'file_size_bytes': file_size,
            'file_size_mb': file_size / (1024 * 1024),
            'estimated_rows': max(0, line_count - 1),  # Subtract header
            'extension': file_path.suffix.lower()
        }

def load_data(database_path: Union[str, Path], type: str = "csv") -> pd.DataFrame:
    logger.warning("Using legacy load_data function. Consider using DataLoader class.")
    
    if type == "csv":
        loader = DataLoader()
        return loader.load_csv(database_path)
    elif type == "json":
        return pd.read_json(database_path)
    elif type == "parquet":
        return pd.read_parquet(database_path)
    else:
        raise ValueError(f"Unsupported file type: {type}")


# Convenience function for quick CSV loading
def load_csv(file_path: Union[str, Path], **kwargs) -> pd.DataFrame:
    """
    Quick CSV loading function.
    
    Args:
        file_path: Path to the CSV file
        **kwargs: Additional arguments for DataLoader.load_csv
        
    Returns:
        Loaded DataFrame
    """
    loader = DataLoader()
    return loader.load_csv(file_path, **kwargs)
