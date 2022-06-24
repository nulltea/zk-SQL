import { Table, Thead, Tbody, Tr, Th, Td, chakra } from '@chakra-ui/react'
import { useTable } from 'react-table'

import React, {useEffect, useState} from "react";

export function TableView() {
  const [columns, setColumns] = useState([]);
  const [values, setValues] = useState([]);
  const [isLoading, setLoading] = useState(false)


  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    useTable({ columns, data: values });

  useEffect(() => {
    setLoading(true);
    console.log("making request");
    fetch('/api/table', {
      method: 'POST',
      body: JSON.stringify({
        sql: "SELECT * FROM table1"
      })
    }).then((res) => res.json())
      .then(({columns, values}) => {
        console.log(columns, values);
        setColumns(columns);
        setValues(values);
        setLoading(false)
      })
  }, []);


  if (isLoading) return <p>Loading...</p>

  return (
    <Table {...getTableProps()}>
      <Thead>
        {headerGroups.map((headerGroup) => (
          <Tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column) => (
              <Th
                {...column.getHeaderProps(column.getHeaderProps())}
              >
                {column.render('Header')}
              </Th>
            ))}
          </Tr>
        ))}
      </Thead>
      <Tbody {...getTableBodyProps()}>
        {rows.map((row) => {
          prepareRow(row)
          return (
            <Tr {...row.getRowProps()}>
              {row.cells.map((cell) => (
                <Td {...cell.getCellProps()}>
                  {cell.render('Cell')}
                </Td>
              ))}
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}
