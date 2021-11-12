/**
 * WordPress dependencies
 */
import {
	createContext,
	useState,
	useEffect,
	useContext,
} from '@wordpress/element';

/**
 * Internal dependencies
 */
import { history } from './history';

const RoutesContext = createContext();

export function useSearchParams() {
	return useContext( RoutesContext );
}

function getSearchParams() {
	const searchParams = new URLSearchParams( history.location.search );
	return Object.fromEntries( searchParams.entries() );
}

export function Routes( { children } ) {
	const [ searchParams, setSearchParams ] = useState( () =>
		getSearchParams()
	);

	useEffect( () => {
		return history.listen( () => {
			setSearchParams( getSearchParams() );
		} );
	}, [] );

	return (
		<RoutesContext.Provider value={ searchParams }>
			{ children( searchParams ) }
		</RoutesContext.Provider>
	);
}
