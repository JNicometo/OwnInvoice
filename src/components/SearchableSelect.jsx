import React from 'react';
import Select from 'react-select';

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  isDisabled = false,
  isClearable = true,
  className = '',
  name = ''
}) {
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '44px',
      borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
      boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
      '&:hover': {
        borderColor: '#3b82f6'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#eff6ff' : 'white',
      color: state.isSelected ? 'white' : '#111827',
      cursor: 'pointer',
      padding: '10px 12px'
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '300px'
    })
  };

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isClearable={isClearable}
      isSearchable={true}
      name={name}
      className={className}
      styles={customStyles}
      menuPlacement="auto"
      maxMenuHeight={300}
    />
  );
}

export default SearchableSelect;
