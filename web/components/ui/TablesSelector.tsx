import React, {useEffect, useState} from "react";
import Link from 'next/link';
import {useForm} from 'react-hook-form';
import {
  Grid, GridItem,
  Modal,
  ModalOverlay,
  ModalContent,
  Text,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Spinner,
  Flex, FormControl, Input, FormErrorMessage, Box, Button,
} from '@chakra-ui/react'
import {CardWrapper} from "./CardWrapper";
import {ActionButton} from "../tools/ActionButton";
import {Contract, ethers} from "ethers";
const buildPoseidon = require("circomlibjs").buildPoseidon;
import ZkSQL from "../../../server/artifacts/contracts/zkSQL.sol/ZkSQL.json";
import {ZkSQL as IZkSQL} from "../../../server/typechain-types";


const CustomModalOverlay = () => {
  return <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(5px)"/>;
};

export function TablesSelector() {
  const [isLoading, setLoading] = useState(false);
  const [isModalLoading, setModalLoading] = useState(false)
  const [tables, setTables] = useState([]);
  const {
    isOpen: opened,
    onOpen: open,
    onClose: close,
  } = useDisclosure({});

  useEffect(() => {
    setLoading(true);
    fetch('/api/tables').then((res) => res.json())
      .then((tables) => {
        setTables(tables);
        setLoading(false);
      });
  }, []);

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm()

  async function createTable(values: { name: string }) {
    setModalLoading(true);
    const columns = ['f1', 'f2', 'f3'];
    let poseidon = await buildPoseidon();
    let commit = poseidon.F.toObject(poseidon([6]));
    const contract = new Contract(process.env.ZK_SQL_CONTRACT!, ZkSQL.abi);
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contractOwner = contract.connect(provider.getSigner()) as IZkSQL;
    await contractOwner.createTable(values.name, BigInt(commit));
    fetch('/api/table/create', {
      method: 'POST',
      body: JSON.stringify({
        table: {
          name: values.name,
          columns,
        },
        commit: commit.toString()
      })
    }).then(() => {
      setModalLoading(false);
      setTables(tables.concat([values.name]));
      close();
    });
  }

  if (isLoading) return <p>Loading...</p>

  return (
    <>
      <Grid templateColumns='repeat(5, 1fr)' gap={6}>
        {
          tables.map((table) => {
            return <GridItem w='100%' h='10' key={table}>
              <CardWrapper mb={4} cursor='pointer'>
                <Link href={`table?name=${table}`}>
                  {table}
                </Link>
              </CardWrapper>
            </GridItem>
          })
        }
        <GridItem w='100%' h='10'>
          <CardWrapper mb={4}>
            <ActionButton onClick={open}>+</ActionButton>
          </CardWrapper>
        </GridItem>
      </Grid>
      <Modal isOpen={opened} size="sm" onClose={close} isCentered>
        <CustomModalOverlay/>
        <ModalContent
          bgColor="dappTemplate.dark.darker"
          px={6}
          pt={7}
          pb={10}
          position="relative"
        >
          <ModalCloseButton _focus={{outline: 'none'}}/>
          <ModalBody>
            <Text textAlign="center" mb={7} fontWeight="black" fontSize="2xl">
              Create table
            </Text>
            {isModalLoading && (
              <Flex
                alignItems="center"
                backdropFilter="blur(3px)"
                bgColor="blackAlpha.700"
                justifyContent="center"
                position="absolute"
                inset={0}
              >
                <Spinner
                  thickness="3px"
                  speed="0.4s"
                  color="dappTemplate.color2.base"
                  size="xl"
                />
              </Flex>
            )}
            <form onSubmit={handleSubmit(createTable)}>
                <FormControl>
                  <Input
                    id='name'
                    placeholder='table2'
                    {...register('name', {
                      required: 'This is required',
                    })}
                  />
                  <FormErrorMessage>
                    {errors.name && errors.name.message}
                  </FormErrorMessage>
                </FormControl>
                <Box w='20px'/>
                <Button colorScheme='teal' isLoading={isSubmitting} type='submit'>
                  Submit
                </Button>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
